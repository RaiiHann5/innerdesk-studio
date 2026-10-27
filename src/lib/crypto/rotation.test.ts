import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalVaultItemRepo, createLocalVaultMetaRepo } from '@/data/repos/local/createLocalVaultRepos'
import type { VaultItemRepo, VaultMetaRepo } from '@/data/repos/interfaces'
import {
  VaultError,
  createVault,
  exportBackup,
  openItem,
  parseBackup,
  restoreBackup,
  rotateVaultKey,
  sealItem,
  settleInterruptedRotation,
  unlockWithPassword,
  unlockWithRecovery,
  type VaultSession,
} from './index'
import { fromBase64 } from './bytes'
import { flipByte, installMemoryStorage } from './testing'

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 })

const PASSWORD = 'correct horse battery staple'
const code = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error instanceof VaultError ? error.code : `other:${String(error)}`),
  )

const PAYLOADS = [
  { kind: 'login', title: 'Bank', password: 'hunter2-bank' },
  { kind: 'apiKey', title: 'Stripe', key: 'sk_live_not_a_real_key' },
  { kind: 'secureNote', title: 'Catatan', body: 'rahasia '.repeat(50) },
]

let storage: ReturnType<typeof installMemoryStorage>
let metaRepo: VaultMetaRepo
let itemRepo: VaultItemRepo
let session: VaultSession
let recoveryKey: string

async function snapshot() {
  return { ...Object.fromEntries(storage.memory) }
}

async function readAll(s: VaultSession) {
  const items = await itemRepo.list()
  return Promise.all(items.map((item) => openItem(s, item)))
}

beforeEach(async () => {
  storage = installMemoryStorage()
  metaRepo = createLocalVaultMetaRepo()
  itemRepo = createLocalVaultItemRepo()
  const created = await createVault(PASSWORD)
  session = created.session
  recoveryKey = created.recoveryKey
  await metaRepo.create(created.meta)
  for (const [index, payload] of PAYLOADS.entries()) {
    await itemRepo.put(await sealItem(session, { id: `item-${index}`, payload }), created.meta.keyEpoch)
  }
})

describe('key rotation', () => {
  it('re-encrypts every item under a new key and issues a new recovery key', async () => {
    const before = await itemRepo.list()
    const progress: Array<[number, number]> = []
    const result = await rotateVaultKey({ metaRepo, itemRepo }, { password: PASSWORD, onProgress: (d, t) => progress.push([d, t]) })

    expect(progress).toEqual([[0, 3], [1, 3], [2, 3], [3, 3]])
    expect(result.meta.keyEpoch).toBe(2)
    expect(result.meta.revision).toBe(2)
    expect(result.recoveryKey).not.toBe(recoveryKey)

    const after = await itemRepo.list()
    expect(after.map((i) => i.id).sort()).toEqual(before.map((i) => i.id).sort())
    for (const item of after) {
      const old = before.find((b) => b.id === item.id)!
      expect(item.iv).not.toBe(old.iv)
      expect(item.ciphertext).not.toBe(old.ciphertext)
      expect(item.createdAt).toBe(old.createdAt)
      expect(item.updatedAt).toBe(old.updatedAt)
    }

    expect(await readAll(result.session)).toEqual(expect.arrayContaining(PAYLOADS))
    expect(await readAll(await unlockWithPassword(result.meta, PASSWORD))).toHaveLength(3)
    expect(await readAll(await unlockWithRecovery(result.meta, result.recoveryKey))).toHaveLength(3)
    // The old recovery key and the old vault key no longer reach anything.
    expect(await code(unlockWithRecovery(result.meta, recoveryKey))).toBe('bad-credentials')
    expect(await code(openItem(session, after[0]))).toBe('corrupt')
    expect(Object.keys(await snapshot()).sort()).toEqual(['pos:v1:vault-items', 'pos:v1:vault-meta'])
    expect(result.session.keyEpoch).toBe(2)
  })

  it('works on an empty vault', async () => {
    for (const item of await itemRepo.list()) await itemRepo.remove(item.id, 1)
    const result = await rotateVaultKey({ metaRepo, itemRepo }, { password: PASSWORD })
    expect(result.meta.keyEpoch).toBe(2)
    expect(await itemRepo.list()).toEqual([])
  })

  it('needs the master password and changes nothing without it', async () => {
    const before = await snapshot()
    expect(await code(rotateVaultKey({ metaRepo, itemRepo }, { password: 'not the password!!' }))).toBe('bad-credentials')
    expect(await snapshot()).toEqual(before)
  })

  it('changes nothing when one item cannot be decrypted', async () => {
    const [first, ...rest] = await itemRepo.list()
    await itemRepo.put({ ...first, ciphertext: flipByte(first.ciphertext, 7) }, 1)
    const before = await snapshot()
    expect(await code(rotateVaultKey({ metaRepo, itemRepo }, { password: PASSWORD }))).toBe('corrupt')
    expect(await snapshot()).toEqual(before)
    const unlocked = await unlockWithPassword((await metaRepo.get())!, PASSWORD)
    for (const item of rest) await openItem(unlocked, item)
  })

  it('changes nothing when staging the new set fails', async () => {
    const before = await snapshot()
    const failing: VaultItemRepo = { ...itemRepo, stageReplace: async () => { throw new VaultError('storage') } }
    expect(await code(rotateVaultKey({ metaRepo, itemRepo: failing }, { password: PASSWORD }))).toBe('storage')
    expect(await snapshot()).toEqual(before)
  })

  it('changes nothing, and clears the staged set, when the meta update is rejected', async () => {
    const before = await snapshot()
    const failing: VaultMetaRepo = { ...metaRepo, update: async () => { throw new VaultError('conflict') } }
    expect(await code(rotateVaultKey({ metaRepo: failing, itemRepo }, { password: PASSWORD }))).toBe('conflict')
    expect(await snapshot()).toEqual(before)
    expect(await readAll(await unlockWithPassword((await metaRepo.get())!, PASSWORD))).toHaveLength(3)
  })

  it('aborts when another tab changed an item while it ran', async () => {
    const before = await snapshot()
    let calls = 0
    const racing: VaultItemRepo = {
      ...itemRepo,
      list: async () => {
        const items = await itemRepo.list()
        return ++calls === 1 ? items : items.slice(1)
      },
    }
    expect(await code(rotateVaultKey({ metaRepo, itemRepo: racing }, { password: PASSWORD }))).toBe('conflict')
    expect(await snapshot()).toEqual(before)
  })

  it('is finished by the next unlock when it stops after the meta update', async () => {
    const stuck: VaultItemRepo = { ...itemRepo, settle: async () => { throw new VaultError('storage') } }
    expect(await code(rotateVaultKey({ metaRepo, itemRepo: stuck }, { password: PASSWORD }))).toBe('storage')

    // The commit point was reached: the meta is new, the live items are still old, the new set waits aside.
    const meta = (await metaRepo.get())!
    expect(meta.keyEpoch).toBe(2)
    expect(storage.memory.has('pos:v1:vault-items-staged')).toBe(true)
    const midway = await unlockWithPassword(meta, PASSWORD)
    expect(await code(openItem(midway, (await itemRepo.list())[0]))).toBe('corrupt')

    await settleInterruptedRotation({ metaRepo, itemRepo })
    expect(storage.memory.has('pos:v1:vault-items-staged')).toBe(false)
    expect(await readAll(await unlockWithPassword(meta, PASSWORD))).toHaveLength(3)
    await settleInterruptedRotation({ metaRepo, itemRepo })
    expect(await readAll(await unlockWithPassword(meta, PASSWORD))).toHaveLength(3)
  })

  it('discards a staged set left by a crash before the meta update', async () => {
    const before = await snapshot()
    await itemRepo.stageReplace([await sealItem(session, { id: 'orphan', payload: {} })], 2)
    await settleInterruptedRotation({ metaRepo, itemRepo })
    expect(await snapshot()).toEqual(before)
  })

  it('rejects a write from a tab that still holds the old key', async () => {
    const result = await rotateVaultKey({ metaRepo, itemRepo }, { password: PASSWORD })
    expect(await code(itemRepo.put(await sealItem(session, { id: 'late', payload: {} }), session.keyEpoch))).toBe('conflict')
    await itemRepo.put(await sealItem(result.session, { id: 'late', payload: {} }), result.session.keyEpoch)
  })
})

describe('encrypted backup', () => {
  it('contains ciphertext and meta only', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    for (const secret of ['hunter2-bank', 'sk_live_not_a_real_key', 'rahasia', PASSWORD, recoveryKey, 'Stripe', 'Bank']) {
      expect(text).not.toContain(secret)
    }
    const parsed = JSON.parse(text)
    expect(Object.keys(parsed).sort()).toEqual(['exportedAt', 'format', 'items', 'meta', 'version'])
    expect(parseBackup(text).items).toHaveLength(3)
  })

  it('restores into an empty browser with the master password, and the recovery key still works', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    storage.memory.clear()

    const restored = await restoreBackup({ metaRepo, itemRepo }, { text, password: PASSWORD })
    expect(restored.meta.keyEpoch).toBe(2)
    expect(restored.session.keyEpoch).toBe(2)
    expect(await readAll(restored.session)).toEqual(expect.arrayContaining(PAYLOADS))
    expect(await readAll(await unlockWithPassword((await metaRepo.get())!, PASSWORD))).toHaveLength(3)
    expect(await readAll(await unlockWithRecovery((await metaRepo.get())!, recoveryKey))).toHaveLength(3)
    expect(Object.keys(await snapshot()).sort()).toEqual(['pos:v1:vault-items', 'pos:v1:vault-meta'])
  })

  it('replaces an existing vault, and a stale tab then cannot write', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    await itemRepo.put(await sealItem(session, { id: 'added-later', payload: { n: 1 } }), 1)
    const restored = await restoreBackup({ metaRepo, itemRepo }, { text, password: PASSWORD })
    expect((await itemRepo.list()).map((i) => i.id).sort()).toEqual(['item-0', 'item-1', 'item-2'])
    expect(restored.meta.revision).toBe(2)
    expect(await code(itemRepo.put(await sealItem(session, { id: 'stale', payload: {} }), 1))).toBe('conflict')
  })

  it('needs the right password and writes nothing otherwise', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    storage.memory.clear()
    expect(await code(restoreBackup({ metaRepo, itemRepo }, { text, password: 'wrong password here' }))).toBe('bad-credentials')
    expect(storage.memory.size).toBe(0)
  })

  it('refuses a backup with a damaged item before writing anything', async () => {
    const backup = JSON.parse(exportBackup((await metaRepo.get())!, await itemRepo.list()))
    backup.items[1].ciphertext = flipByte(backup.items[1].ciphertext, 20)
    storage.memory.clear()
    expect(await code(restoreBackup({ metaRepo, itemRepo }, { text: JSON.stringify(backup), password: PASSWORD }))).toBe('corrupt')
    expect(storage.memory.size).toBe(0)
  })

  it('rejects files that are not a backup of this vault format', () => {
    for (const text of ['', 'nope', '[]', '{}', JSON.stringify({ format: 'something-else', version: 1 })]) {
      expect(() => parseBackup(text)).toThrow(VaultError)
    }
  })

  it('rejects a newer backup version and extra top-level fields', async () => {
    const base = JSON.parse(exportBackup((await metaRepo.get())!, await itemRepo.list()))
    expect(() => parseBackup(JSON.stringify({ ...base, version: 2 }))).toThrow(VaultError)
    expect(() => parseBackup(JSON.stringify({ ...base, extra: 1 }))).toThrow(VaultError)
    expect(() => parseBackup(JSON.stringify({ ...base, items: [base.items[0], base.items[0]] }))).toThrow(VaultError)
    expect(fromBase64(base.items[0].iv)).toHaveLength(12)
  })
})

describe('restoring over a damaged vault', () => {
  it('replaces unreadable meta and items once the backup is verified, and the restored vault opens', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    storage.memory.set('pos:v1:vault-meta', '{broken')
    storage.memory.set('pos:v1:vault-items', 'garbage')
    expect(await code(metaRepo.get())).toBe('corrupt')

    const restored = await restoreBackup({ metaRepo, itemRepo }, { text, password: PASSWORD })
    expect(restored.meta.keyEpoch).toBe(2)
    expect(await readAll(restored.session)).toEqual(expect.arrayContaining(PAYLOADS))
    expect(await readAll(await unlockWithPassword((await metaRepo.get())!, PASSWORD))).toHaveLength(3)
    expect(storage.memory.has('pos:v1:vault-items-staged')).toBe(false)
  })

  it('leaves a damaged vault alone when the backup does not check out', async () => {
    const text = exportBackup((await metaRepo.get())!, await itemRepo.list())
    storage.memory.set('pos:v1:vault-meta', '{broken')
    expect(await code(restoreBackup({ metaRepo, itemRepo }, { text, password: 'wrong password here' }))).toBe('bad-credentials')
    expect(storage.memory.get('pos:v1:vault-meta')).toBe('{broken')
  })
})
