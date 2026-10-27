import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fromBase64, toBase64 } from '@/lib/crypto/bytes'
import { VaultError, createVault, sealItem, type EncryptedItem, type VaultMeta, type VaultSession } from '@/lib/crypto'
import { flipByte, installMemoryStorage } from '@/lib/crypto/testing'
import { createLocalVaultItemRepo, createLocalVaultMetaRepo } from './createLocalVaultRepos'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 })

const META_KEY = 'pos:v1:vault-meta'
const ITEMS_KEY = 'pos:v1:vault-items'
const STAGED_KEY = 'pos:v1:vault-items-staged'

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error instanceof VaultError ? error.code : `other:${String(error)}`),
  )

let meta: VaultMeta
let session: VaultSession
let storage: ReturnType<typeof installMemoryStorage>
const item = (id: string) => sealItem(session, { id, payload: { id } })

beforeEach(async () => {
  storage = installMemoryStorage()
  if (!meta) {
    const created = await createVault('correct horse battery staple')
    meta = created.meta
    session = created.session
  }
})

describe('local vault meta repo', () => {
  it('returns null only when nothing is stored', async () => {
    expect(await createLocalVaultMetaRepo().get()).toBeNull()
  })

  it('stores the record under its own key and reads it back', async () => {
    const repo = createLocalVaultMetaRepo()
    await repo.create(meta)
    expect([...storage.memory.keys()]).toEqual([META_KEY])
    expect(await repo.get()).toEqual(meta)
  })

  it('throws, instead of returning null, when the stored value is damaged', async () => {
    const repo = createLocalVaultMetaRepo()
    storage.memory.set(META_KEY, '{not json')
    expect(await code(repo.get())).toBe('corrupt')
    storage.memory.set(META_KEY, JSON.stringify({ ...meta, kdf: { ...meta.kdf, iterations: 10 } }))
    expect(await code(repo.get())).toBe('corrupt')
    storage.memory.set(META_KEY, JSON.stringify({ ...meta, extra: true }))
    expect(await code(repo.get())).toBe('corrupt')
  })

  it('will not let setup overwrite a vault, damaged or not', async () => {
    const repo = createLocalVaultMetaRepo()
    await repo.create(meta)
    expect(await code(repo.create(meta))).toBe('conflict')
    storage.memory.set(META_KEY, '{not json')
    expect(await code(repo.create(meta))).toBe('conflict')
    expect(storage.memory.get(META_KEY)).toBe('{not json')
  })

  it('updates only from the current revision: a stale tab is rejected', async () => {
    const repo = createLocalVaultMetaRepo()
    await repo.create(meta)
    const next = { ...meta, revision: meta.revision + 1 }
    await repo.update(next)
    expect(await code(repo.update(next))).toBe('conflict')
    expect(await code(repo.update({ ...meta, revision: meta.revision + 5 }))).toBe('conflict')
    expect(await code(repo.update({ ...next, revision: next.revision + 1, keyEpoch: meta.keyEpoch - 1 } as VaultMeta))).toBe('corrupt')
    expect((await repo.get())?.revision).toBe(next.revision)
  })

  it('overwrites unconditionally, but only with a valid record', async () => {
    const repo = createLocalVaultMetaRepo()
    storage.memory.set(META_KEY, '{broken')
    await repo.overwrite(meta)
    expect(await repo.get()).toEqual(meta)
    expect(await code(repo.overwrite({ ...meta, extra: 1 } as unknown as VaultMeta))).toBe('corrupt')
    expect(await repo.get()).toEqual(meta)
  })

  it('refuses to update a vault that is not there', async () => {
    expect(await code(createLocalVaultMetaRepo().update({ ...meta, revision: 2 }))).toBe('conflict')
  })

  it('throws when storage fails', async () => {
    storage.state.failWrites = true
    expect(await code(createLocalVaultMetaRepo().create(meta))).toBe('storage')
  })
})

describe('local vault item repo', () => {
  it('starts empty, and stores items under their own key', async () => {
    const repo = createLocalVaultItemRepo()
    expect(await repo.list()).toEqual([])
    const a = await item('a')
    await repo.put(a, 1)
    expect([...storage.memory.keys()]).toEqual([ITEMS_KEY])
    expect(await repo.get('a')).toEqual(a)
    expect(await repo.get('missing')).toBeNull()
  })

  it('stores exactly the encrypted fields and nothing else', async () => {
    const repo = createLocalVaultItemRepo()
    await repo.put(await item('a'), 1)
    const stored = JSON.parse(storage.memory.get(ITEMS_KEY)!)
    expect(Object.keys(stored).sort()).toEqual(['items', 'keyEpoch'])
    expect(Object.keys(stored.items[0]).sort()).toEqual(['ciphertext', 'createdAt', 'id', 'iv', 'updatedAt', 'v'])
    // A caller that tries to smuggle in a plaintext field is refused and nothing is written.
    const before = storage.memory.get(ITEMS_KEY)
    expect(await code(repo.put({ ...(await item('b')), title: 'Bank' } as unknown as EncryptedItem, 1))).toBe('corrupt')
    expect(storage.memory.get(ITEMS_KEY)).toBe(before)
  })

  it('replaces on put, removes idempotently, and restores the same ciphertext (undo)', async () => {
    const repo = createLocalVaultItemRepo()
    const first = await item('a')
    await repo.put(first, 1)
    const edited = await item('a')
    await repo.put(edited, 1)
    expect(await repo.list()).toEqual([edited])
    await repo.remove('a', 1)
    await repo.remove('a', 1)
    expect(await repo.list()).toEqual([])
    await repo.restore(edited, 1)
    expect(await repo.get('a')).toEqual(edited)
    expect(await code(repo.restore(edited, 1))).toBe('conflict')
  })

  it('rejects writes made against another key epoch (a stale tab after a rotation)', async () => {
    const repo = createLocalVaultItemRepo()
    await repo.put(await item('a'), 2)
    expect(await code(repo.put(await item('b'), 1))).toBe('conflict')
    expect(await code(repo.remove('a', 1))).toBe('conflict')
    expect(await code(repo.restore(await item('c'), 1))).toBe('conflict')
    expect((await repo.list()).map((i) => i.id)).toEqual(['a'])
  })

  it('throws, instead of returning an empty list, when stored data is damaged', async () => {
    const repo = createLocalVaultItemRepo()
    storage.memory.set(ITEMS_KEY, 'garbage')
    expect(await code(repo.list())).toBe('corrupt')
    storage.memory.set(ITEMS_KEY, JSON.stringify({ keyEpoch: 1, items: [{ id: 'a' }] }))
    expect(await code(repo.list())).toBe('corrupt')
    const a = await item('a')
    storage.memory.set(ITEMS_KEY, JSON.stringify({ keyEpoch: 1, items: [a, a] }))
    expect(await code(repo.list())).toBe('corrupt')
    storage.memory.set(ITEMS_KEY, JSON.stringify({ keyEpoch: 1, items: [{ ...a, ciphertext: toBase64(new Uint8Array(10)) }] }))
    expect(await code(repo.list())).toBe('corrupt')
  })

  it('throws when storage fails', async () => {
    storage.state.failWrites = true
    expect(await code(createLocalVaultItemRepo().put(await item('a'), 1))).toBe('storage')
  })

  describe('staged replacement', () => {
    it('is invisible until settled', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.put(await item('old'), 1)
      await repo.stageReplace([await item('new')], 2)
      expect((await repo.list()).map((i) => i.id)).toEqual(['old'])
      expect(storage.memory.has(STAGED_KEY)).toBe(true)
    })

    it('goes live when its epoch matches the vault, and the staging area is cleared', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.put(await item('old'), 1)
      await repo.stageReplace([await item('new')], 2)
      await repo.settle(2)
      expect((await repo.list()).map((i) => i.id)).toEqual(['new'])
      expect(storage.memory.has(STAGED_KEY)).toBe(false)
      await repo.settle(2)
      expect((await repo.list()).map((i) => i.id)).toEqual(['new'])
      await repo.put(await item('after'), 2)
    })

    it('is discarded when the vault never moved to its epoch', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.put(await item('old'), 1)
      await repo.stageReplace([await item('new')], 2)
      await repo.settle(1)
      expect((await repo.list()).map((i) => i.id)).toEqual(['old'])
      expect(storage.memory.has(STAGED_KEY)).toBe(false)
    })

    it('does not overwrite a live set that is already at that epoch', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.stageReplace([await item('stale')], 2)
      await repo.put(await item('live'), 2)
      await repo.settle(2)
      expect((await repo.list()).map((i) => i.id)).toEqual(['live'])
    })

    it('drops a damaged staged set without touching the live one', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.put(await item('old'), 1)
      storage.memory.set(STAGED_KEY, 'garbage')
      await repo.settle(1)
      expect((await repo.list()).map((i) => i.id)).toEqual(['old'])
      expect(storage.memory.has(STAGED_KEY)).toBe(false)
    })

    it('replaces a damaged live set with a staged one that matches the vault', async () => {
      const repo = createLocalVaultItemRepo()
      storage.memory.set(ITEMS_KEY, 'garbage')
      await repo.stageReplace([await item('restored')], 3)
      await repo.settle(3)
      expect((await repo.list()).map((i) => i.id)).toEqual(['restored'])
    })

    it('never lets a staged set from another epoch replace a damaged live set', async () => {
      const repo = createLocalVaultItemRepo()
      storage.memory.set(ITEMS_KEY, 'garbage')
      await repo.stageReplace([await item('stale')], 2)
      await repo.settle(3)
      expect(storage.memory.get(ITEMS_KEY)).toBe('garbage')
      expect(storage.memory.has(STAGED_KEY)).toBe(false)
    })

    it('can be discarded', async () => {
      const repo = createLocalVaultItemRepo()
      await repo.stageReplace([await item('new')], 2)
      await repo.discardStaged()
      expect(storage.memory.has(STAGED_KEY)).toBe(false)
    })
  })

  it('flipping a stored byte is caught later by decryption, not hidden by the repo', async () => {
    const repo = createLocalVaultItemRepo()
    const a = await item('a')
    await repo.put({ ...a, ciphertext: flipByte(a.ciphertext, 3) }, 1)
    expect(fromBase64((await repo.list())[0].ciphertext)).toHaveLength(fromBase64(a.ciphertext).length)
  })
})
