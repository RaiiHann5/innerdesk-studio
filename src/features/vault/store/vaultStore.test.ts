import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalVaultItemRepo, createLocalVaultMetaRepo } from '@/data/repos/local/createLocalVaultRepos'
import { openItem, sealItem, unlockWithPassword, unlockWithRecovery } from '@/lib/crypto'
import { flipByte } from '@/lib/crypto/testing'
import { emptyPayload } from '../lib/payload'
import type { VaultItemPayload } from '../types'
import { installMemoryStorage } from '@/lib/crypto/testing'
import type { VaultItem } from '../types'
import { createVaultStore } from './vaultStore'
import { GUARD_KEY, createUnlockGuard } from './unlockGuard'

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 })

const PASSWORD = 'correct horse battery staple'
const WRONG = 'definitely not the password'

let clock: number
let storage: ReturnType<typeof installMemoryStorage>
let metaRepo: ReturnType<typeof createLocalVaultMetaRepo>
let itemRepo: ReturnType<typeof createLocalVaultItemRepo>
let store: ReturnType<typeof createVaultStore>
const state = () => store.useStore.getState()

const build = () => {
  metaRepo = createLocalVaultMetaRepo()
  itemRepo = createLocalVaultItemRepo()
  store = createVaultStore({ metaRepo, itemRepo, guard: createUnlockGuard({ now: () => clock }), now: () => clock })
}

async function setupVault() {
  await state().init()
  const recoveryKey = await state().beginSetup(PASSWORD)
  expect(await state().confirmSetup()).toEqual({ ok: true })
  return recoveryKey
}

beforeEach(() => {
  clock = 1_000_000
  storage = installMemoryStorage()
  build()
})

describe('init', () => {
  it('asks for setup when no vault exists, and for the password when one does', async () => {
    expect(state().status).toBe('loading')
    await state().init()
    expect(state().status).toBe('needs-setup')
    await setupVault().catch(() => undefined)
    build()
    await state().init()
    expect(state().status).toBe('locked')
  })

  it('never offers setup over a vault it cannot read', async () => {
    storage.memory.set('pos:v1:vault-meta', '{not json')
    await state().init()
    expect(state().status).toBe('error')
    await expect(state().beginSetup(PASSWORD)).rejects.toThrow()
    expect(storage.memory.get('pos:v1:vault-meta')).toBe('{not json')
  })

  it('still unlocks when only the item list is damaged, reports it as unreadable, and never rewrites it', async () => {
    await setupVault()
    storage.memory.set('pos:v1:vault-items', 'garbage')
    build()
    await state().init()
    expect(state().status).toBe('locked')
    expect(await state().unlock(PASSWORD)).toEqual({ ok: true })
    expect(state().itemCount).toBeNull()
    expect(storage.memory.get('pos:v1:vault-items')).toBe('garbage')
  })

  it('is always locked after a reload, whatever happened before', async () => {
    await setupVault()
    expect(state().status).toBe('unlocked')
    build()
    expect(state().status).toBe('loading')
    await state().init()
    expect(state().status).toBe('locked')
    expect(store.getSession()).toBeNull()
  })
})

describe('setup', () => {
  it('stores nothing until the recovery key is confirmed', async () => {
    await state().init()
    const recoveryKey = await state().beginSetup(PASSWORD)
    expect(recoveryKey).toMatch(/^([0-9A-Z]{4}-){7}[0-9A-Z]{4}$/)
    expect(storage.memory.size).toBe(0)
    expect(state().status).toBe('needs-setup')
    state().cancelSetup()
    expect(storage.memory.size).toBe(0)
    expect(await state().confirmSetup()).toEqual({ ok: false, error: 'unavailable' })
  })

  it('writes the meta on confirm and opens the vault', async () => {
    await state().init()
    await state().beginSetup(PASSWORD)
    await state().confirmSetup()
    expect(state().status).toBe('unlocked')
    expect(state().itemCount).toBe(0)
    expect(store.getSession()?.active).toBe(true)
    expect([...storage.memory.keys()]).toEqual(['pos:v1:vault-meta'])
  })

  it('refuses a short master password', async () => {
    await state().init()
    await expect(state().beginSetup('too short')).rejects.toMatchObject({ code: 'invalid-input' })
  })

  it('does not overwrite a vault created in another tab', async () => {
    await state().init()
    await state().beginSetup(PASSWORD)
    const other = createLocalVaultMetaRepo()
    const stray = await (await import('@/lib/crypto')).createVault('another long passphrase')
    await other.create(stray.meta)
    expect(await state().confirmSetup()).toEqual({ ok: false, error: 'conflict' })
    expect(state().status).toBe('locked')
    expect(await metaRepo.get()).toEqual(stray.meta)
  })
})

describe('unlock and lock', () => {
  it('opens items that were sealed under the vault key, and locking drops everything', async () => {
    await setupVault()
    const session = store.getSession()!
    const sealed = await sealItem(session, { id: 'a', payload: { secret: 'hunter2' } })
    await itemRepo.put(sealed, session.keyEpoch)
    state().lock('manual')

    expect(state().status).toBe('locked')
    expect(state().lockReason).toBe('manual')
    expect(state().items).toEqual([])
    expect(store.getSession()).toBeNull()
    expect(session.active).toBe(false)

    expect(await state().unlock(PASSWORD)).toEqual({ ok: true })
    expect(state().itemCount).toBe(1)
    expect(await openItem(store.getSession()!, sealed)).toEqual({ secret: 'hunter2' })
  })

  it('clears the decrypted store on lock and announces why', async () => {
    await setupVault()
    store.useStore.setState({ items: [{ id: 'x', kind: 'secureNote', title: 't', body: 'b', tags: [], favorite: false, createdAt: '', updatedAt: '' } as VaultItem] })
    state().lock('idle', 15)
    expect(state().items).toEqual([])
    expect(state().announcement).toContain('15 menit')
  })

  it('stays locked on a wrong password with a plain error, and does not reveal a hint', async () => {
    await setupVault()
    state().lock('manual')
    expect(await state().unlock(WRONG)).toEqual({ ok: false, error: 'wrong' })
    expect(state().status).toBe('locked')
    expect(store.getSession()).toBeNull()
  })

  it('makes the person wait after repeated failures, without trying the password during the wait', async () => {
    await setupVault()
    state().lock('manual')
    await state().unlock(WRONG)
    await state().unlock(WRONG)
    const third = await state().unlock(WRONG)
    expect(third).toEqual({ ok: false, error: 'wait', retryAt: clock + 5_000 })

    const started = Date.now()
    expect(await state().unlock(PASSWORD)).toEqual({ ok: false, error: 'wait', retryAt: clock + 5_000 })
    expect(Date.now() - started).toBeLessThan(200)
    expect(state().status).toBe('locked')

    clock += 5_000
    expect(await state().unlock(PASSWORD)).toEqual({ ok: true })
    expect(storage.memory.has(GUARD_KEY)).toBe(false)
  })

  it('ignores a second unlock while one is running', async () => {
    await setupVault()
    state().lock('manual')
    const [first, second] = await Promise.all([state().unlock(PASSWORD), state().unlock(PASSWORD)])
    expect([first.ok, second.ok].sort()).toEqual([false, true])
  })

  it('does nothing harmful when locked twice or while already locked', async () => {
    await setupVault()
    state().lock('manual')
    state().lock('idle')
    expect(state().lockReason).toBe('manual')
    expect(state().status).toBe('locked')
  })
})

describe('recovery', () => {
  it('sets a new master password from the recovery key and keeps the recovery key valid', async () => {
    const recoveryKey = await setupVault()
    state().lock('manual')
    expect(await state().unlockWithRecovery('NOT-A-KEY', 'a brand new passphrase!')).toEqual({ ok: false, error: 'invalid' })
    expect(await state().unlockWithRecovery(recoveryKey, 'a brand new passphrase!')).toEqual({ ok: true })
    const meta = (await metaRepo.get())!
    expect(meta.revision).toBe(2)
    state().lock('manual')
    expect(await state().unlock(PASSWORD)).toEqual({ ok: false, error: 'wrong' })
    expect(await state().unlock('a brand new passphrase!')).toEqual({ ok: true })
    await unlockWithRecovery(meta, recoveryKey)
    await unlockWithPassword(meta, 'a brand new passphrase!')
  })

  it('counts a wrong recovery key as a failed attempt', async () => {
    await setupVault()
    state().lock('manual')
    const wrong = '0000-0000-0000-0000-0000-0000-0000-0000'
    await state().unlockWithRecovery(wrong, 'a brand new passphrase!')
    await state().unlockWithRecovery(wrong, 'a brand new passphrase!')
    expect((await state().unlockWithRecovery(wrong, 'a brand new passphrase!')).ok).toBe(false)
    expect(createUnlockGuard({ now: () => clock }).remainingMs()).toBeGreaterThan(0)
  })
})

describe('what ends up in memory and storage', () => {
  it('keeps the key and the setup out of the state, and the password and recovery key out of storage', async () => {
    const recoveryKey = await setupVault()
    const dump = JSON.stringify(state())
    expect(dump).not.toContain(PASSWORD)
    expect(dump).not.toContain(recoveryKey)
    expect(Object.keys(state())).not.toContain('session')
    await state().unlock(WRONG)
    for (const value of storage.memory.values()) {
      expect(value).not.toContain(PASSWORD)
      expect(value).not.toContain(WRONG)
      expect(value).not.toContain(recoveryKey)
    }
  })
})

const login = (over: Partial<VaultItemPayload> = {}) => ({ ...emptyPayload('login'), title: 'Bank', username: 'budi', password: 'hunter2-secret', ...over }) as VaultItemPayload

describe('items', () => {
  it('saves an item encrypted, and a later unlock reads it back', async () => {
    await setupVault()
    const saved = await state().saveItem(login())
    expect(saved.ok).toBe(true)
    expect(state().items).toHaveLength(1)

    const stored = JSON.stringify(await itemRepo.list())
    for (const secret of ['hunter2-secret', 'budi', 'Bank']) expect(stored).not.toContain(secret)

    state().lock('manual')
    expect(state().items).toEqual([])
    await state().unlock(PASSWORD)
    expect(state().itemsStatus).toBe('idle')
    await state().loadItems()
    expect(state().itemsStatus).toBe('ready')
    expect(state().items[0]).toMatchObject({ kind: 'login', title: 'Bank', password: 'hunter2-secret' })
  })

  it('keeps createdAt on edit and the last 5 passwords in the history', async () => {
    await setupVault()
    const first = await state().saveItem(login({ password: 'p0' } as Partial<VaultItemPayload>))
    if (!first.ok) throw new Error('save failed')
    const created = state().items[0].createdAt
    for (let i = 1; i <= 8; i++) await state().saveItem(login({ password: `p${i}` } as Partial<VaultItemPayload>), first.id)
    const item = state().items[0]
    expect(state().items).toHaveLength(1)
    expect(item.createdAt).toBe(created)
    expect(item.kind === 'login' && item.passwordHistory.map((h) => h.password)).toEqual(['p7', 'p6', 'p5', 'p4', 'p3'])
    expect(state().itemCount).toBe(1)
  })

  it('removes an item and undo restores the very same ciphertext', async () => {
    await setupVault()
    const saved = await state().saveItem(login())
    if (!saved.ok) throw new Error('save failed')
    const before = (await itemRepo.get(saved.id))!
    expect((await state().removeItem(saved.id)).ok).toBe(true)
    expect(state().items).toEqual([])
    expect(await itemRepo.get(saved.id)).toBeNull()
    expect((await state().undoRemove()).ok).toBe(true)
    expect(await itemRepo.get(saved.id)).toEqual(before)
    expect(state().items[0]).toMatchObject({ id: saved.id, title: 'Bank', password: 'hunter2-secret' })
    expect(state().itemCount).toBe(1)
    expect((await state().undoRemove()).ok).toBe(false)
  })

  it('cannot undo after the vault was locked', async () => {
    await setupVault()
    const saved = await state().saveItem(login())
    if (!saved.ok) throw new Error('save failed')
    await state().removeItem(saved.id)
    state().lock('manual')
    await state().unlock(PASSWORD)
    expect((await state().undoRemove()).ok).toBe(false)
    expect(await itemRepo.get(saved.id)).toBeNull()
  })

  it('counts items it cannot read and leaves them exactly as stored', async () => {
    await setupVault()
    const a = await state().saveItem(login({ title: 'A' } as Partial<VaultItemPayload>))
    const b = await state().saveItem(login({ title: 'B' } as Partial<VaultItemPayload>))
    if (!a.ok || !b.ok) throw new Error('save failed')
    const record = (await itemRepo.get(b.id))!
    const tampered = { ...record, ciphertext: flipByte(record.ciphertext, 9) }
    await itemRepo.put(tampered, state().meta!.keyEpoch)
    state().lock('manual')
    await state().unlock(PASSWORD)
    await state().loadItems()
    expect(state().items.map((i) => i.id)).toEqual([a.id])
    expect(state().unreadable).toBe(1)
    expect(state().itemsStatus).toBe('ready')
    expect(await itemRepo.get(b.id)).toEqual(tampered)
  })

  it('refuses an invalid draft and a write against another key epoch, and writes nothing', async () => {
    await setupVault()
    expect(await state().saveItem(login({ title: '  ' } as Partial<VaultItemPayload>))).toMatchObject({ ok: false, error: 'invalid' })
    expect(await itemRepo.list()).toEqual([])
    const session = store.getSession()!
    await itemRepo.put(await sealItem(session, { id: 'other', payload: {} }), 99)
    expect(await state().saveItem(login())).toMatchObject({ ok: false, error: 'conflict' })
    expect((await itemRepo.list()).map((i) => i.id)).toEqual(['other'])
    expect(state().items).toEqual([])
  })

  it('does nothing while locked', async () => {
    await setupVault()
    state().lock('manual')
    expect(await state().saveItem(login())).toMatchObject({ ok: false, error: 'locked' })
    expect(await state().removeItem('x')).toMatchObject({ ok: false, error: 'locked' })
    expect(await itemRepo.list()).toEqual([])
  })
})

describe('settings actions', () => {
  it('changes the master password: the old one stops working, items stay readable, the recovery key still works', async () => {
    const recoveryKey = await setupVault()
    const saved = await state().saveItem(login())
    if (!saved.ok) throw new Error('save failed')
    expect(await state().changePassword(WRONG, 'a brand new passphrase!')).toEqual({ ok: false, error: 'wrong' })
    expect(await state().changePassword(PASSWORD, 'short')).toEqual({ ok: false, error: 'invalid' })
    expect(await state().changePassword(PASSWORD, 'a brand new passphrase!')).toEqual({ ok: true })
    expect(state().meta!.revision).toBe(2)
    expect(state().announcement).toBe('Kata sandi utama diganti.')

    state().lock('manual')
    expect(await state().unlock(PASSWORD)).toEqual({ ok: false, error: 'wrong' })
    expect(await state().unlock('a brand new passphrase!')).toEqual({ ok: true })
    await state().loadItems()
    expect(state().items[0]).toMatchObject({ title: 'Bank', password: 'hunter2-secret' })
    await unlockWithRecovery((await metaRepo.get())!, recoveryKey)
  })

  it('does nothing while locked', async () => {
    await setupVault()
    state().lock('manual')
    expect(await state().changePassword(PASSWORD, 'a brand new passphrase!')).toEqual({ ok: false, error: 'unavailable' })
    expect(await state().rotateKey(PASSWORD)).toEqual({ ok: false, error: 'unavailable' })
  })

  it('rotates the key: a new recovery key, the same items, a new session, and no undo from before', async () => {
    const oldRecovery = await setupVault()
    const a = await state().saveItem(login({ title: 'A' } as Partial<VaultItemPayload>))
    const b = await state().saveItem(login({ title: 'B' } as Partial<VaultItemPayload>))
    if (!a.ok || !b.ok) throw new Error('save failed')
    await state().removeItem(b.id)
    const before = store.getSession()!
    const progress: number[] = []

    const result = await state().rotateKey(PASSWORD, (done) => progress.push(done))
    if (!('recoveryKey' in result)) throw new Error('rotation failed')
    expect(result.recoveryKey).not.toBe(oldRecovery)
    expect(progress.at(-1)).toBe(1)
    expect(before.active).toBe(false)
    expect(store.getSession()!.keyEpoch).toBe(2)
    expect(state().meta!.keyEpoch).toBe(2)
    expect((await state().undoRemove()).ok).toBe(false)

    const saveAfter = await state().saveItem(login({ title: 'C' } as Partial<VaultItemPayload>))
    expect(saveAfter.ok).toBe(true)
    state().lock('manual')
    await state().unlock(PASSWORD)
    await state().loadItems()
    expect(state().items.map((i) => (i.kind === 'login' ? i.title : '')).sort()).toEqual(['A', 'C'])
    expect((await unlockWithRecovery((await metaRepo.get())!, result.recoveryKey)).active).toBe(true)
  })

  it('refuses a rotation with the wrong password, and when an item cannot be read, without changing anything', async () => {
    await setupVault()
    const a = await state().saveItem(login())
    if (!a.ok) throw new Error('save failed')
    const before = JSON.stringify([...storage.memory.entries()].filter(([k]) => k.startsWith('pos:v1:')))
    expect(await state().rotateKey(WRONG)).toEqual({ ok: false, error: 'wrong' })

    const record = (await itemRepo.get(a.id))!
    await itemRepo.put({ ...record, ciphertext: flipByte(record.ciphertext, 5) }, 1)
    const damaged = JSON.stringify([...storage.memory.entries()].filter(([k]) => k.startsWith('pos:v1:')))
    expect(await state().rotateKey(PASSWORD)).toEqual({ ok: false, error: 'corrupt' })
    expect(JSON.stringify([...storage.memory.entries()].filter(([k]) => k.startsWith('pos:v1:')))).toBe(damaged)
    expect(damaged).not.toBe(before)
  })

  it('exports ciphertext only, and restores it into an empty browser', async () => {
    await setupVault()
    await state().saveItem(login())
    const backup = await state().exportBackup()
    for (const secret of ['hunter2-secret', 'budi', 'Bank', PASSWORD]) expect(backup).not.toContain(secret)

    storage.memory.clear()
    build()
    await state().init()
    expect(state().status).toBe('needs-setup')
    expect(await state().restoreBackup(backup, WRONG)).toEqual({ ok: false, error: 'wrong' })
    expect(storage.memory.has('pos:v1:vault-meta')).toBe(false)
    expect(await state().restoreBackup('not a backup', PASSWORD)).toEqual({ ok: false, error: 'corrupt' })

    expect(await state().restoreBackup(backup, PASSWORD)).toEqual({ ok: true })
    expect(state().status).toBe('unlocked')
    await state().loadItems()
    expect(state().items[0]).toMatchObject({ title: 'Bank', password: 'hunter2-secret' })
  })

  it('restores from the error screen over a vault that cannot be read', async () => {
    await setupVault()
    await state().saveItem(login())
    const backup = await state().exportBackup()
    storage.memory.set('pos:v1:vault-meta', '{broken')
    build()
    await state().init()
    expect(state().status).toBe('error')
    expect(await state().restoreBackup(backup, PASSWORD)).toEqual({ ok: true })
    expect(state().status).toBe('unlocked')
    await state().loadItems()
    expect(state().items).toHaveLength(1)
  })

  it('deletes only the items that could not be read, and says how many', async () => {
    await setupVault()
    const a = await state().saveItem(login({ title: 'Good' } as Partial<VaultItemPayload>))
    const b = await state().saveItem(login({ title: 'Bad' } as Partial<VaultItemPayload>))
    if (!a.ok || !b.ok) throw new Error('save failed')
    const record = (await itemRepo.get(b.id))!
    await itemRepo.put({ ...record, ciphertext: flipByte(record.ciphertext, 5) }, 1)
    state().lock('manual')
    await state().unlock(PASSWORD)
    await state().loadItems()
    expect(state().unreadableIds).toEqual([b.id])
    expect(await state().removeUnreadable()).toBe(1)
    expect(state().unreadable).toBe(0)
    expect((await itemRepo.list()).map((i) => i.id)).toEqual([a.id])
    expect(state().items.map((i) => i.id)).toEqual([a.id])
  })
})
