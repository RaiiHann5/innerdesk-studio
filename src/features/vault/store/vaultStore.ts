import { create } from 'zustand'
import { vaultItemRepo, vaultMetaRepo } from '@/data/repos'
import type { VaultItemRepo, VaultMetaRepo } from '@/data/repos/interfaces'
import {
  VaultError,
  changePassword as changeMasterPassword,
  createVault,
  exportBackup as exportBackupText,
  restoreBackup as restoreBackupFile,
  rotateVaultKey,
  isVaultError,
  newItemId,
  openItem,
  resetPasswordWithRecovery,
  sealItem,
  settleInterruptedRotation,
  unlockWithPassword,
  type EncryptedItem,
  type VaultMeta,
  type VaultSession,
} from '@/lib/crypto'
import { lockMessage, DEFAULT_IDLE_MINUTES, type IdleMinutes, type LockReason } from '../lib/autoLock'
import { nextHistory, parsePayload, validateDraft } from '../lib/payload'
import type { LoginPayload, VaultItem, VaultItemPayload } from '../types'
import { createUnlockGuard, type UnlockGuard } from './unlockGuard'

export type VaultStatus = 'loading' | 'needs-setup' | 'locked' | 'unlocked' | 'error'

export type ItemsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type ItemResult = { ok: true; id: string } | { ok: false; error: 'invalid' | 'locked' | 'conflict' | 'storage'; message?: string }

export type UnlockResult =
  | { ok: true }
  | { ok: false; error: 'wrong' | 'invalid' | 'busy' | 'conflict' | 'unavailable' | 'corrupt' }
  | { ok: false; error: 'wait'; retryAt: number }

interface VaultState {
  status: VaultStatus
  /** Wrapped keys and parameters only. Not secret on its own, and what the repos hold anyway. */
  meta: VaultMeta | null
  /** Encrypted items in storage, or null when the stored list could not be read. */
  itemCount: number | null
  /** The decrypted items. Only ever in this store, never persisted, empty whenever the vault is locked. */
  items: VaultItem[]
  itemsStatus: ItemsStatus
  /** Stored items that could not be decrypted or understood. They are left exactly as they are. */
  unreadable: number
  unreadableIds: string[]
  /** Why the last lock happened, for the lock screen. */
  lockReason: LockReason | null
  /** Text for the aria-live region. */
  announcement: string
  init: () => Promise<void>
  /** Creates the vault in memory only and returns the recovery key. Nothing is stored until `confirmSetup`. */
  beginSetup: (password: string) => Promise<string>
  /** Call once the person confirmed they saved the recovery key. This is when the vault is written. */
  confirmSetup: () => Promise<UnlockResult>
  cancelSetup: () => void
  unlock: (password: string) => Promise<UnlockResult>
  unlockWithRecovery: (recoveryKey: string, newPassword: string) => Promise<UnlockResult>
  lock: (reason: LockReason, idleMinutes?: IdleMinutes) => void
  loadItems: () => Promise<void>
  /** Creates (no `id`) or edits an item. The password history of a login is kept here, not by the form. */
  saveItem: (payload: VaultItemPayload, id?: string) => Promise<ItemResult>
  removeItem: (id: string) => Promise<ItemResult>
  /** Puts back the most recently removed item with its original ciphertext. */
  undoRemove: () => Promise<ItemResult>
  /** Re-wraps the vault key under a new master password. Needs the current one again. Items are not touched. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<UnlockResult>
  /** New vault key, new recovery key (returned once, never stored), every item re-encrypted. All or nothing. */
  rotateKey: (password: string, onProgress?: (done: number, total: number) => void) => Promise<UnlockResult | { ok: true; recoveryKey: string }>
  /** The encrypted backup file as text: ciphertext and meta only. */
  exportBackup: () => Promise<string>
  /** Replaces the whole vault with a backup, in any state except loading. Opens the restored vault. */
  restoreBackup: (text: string, password: string, onProgress?: (done: number, total: number) => void) => Promise<UnlockResult>
  /** Permanently deletes the stored items that could not be read. Returns how many were removed. */
  removeUnreadable: () => Promise<number>
}

export interface VaultStoreDeps {
  metaRepo: VaultMetaRepo
  itemRepo: VaultItemRepo
  guard: UnlockGuard
  now?: () => number
}

/**
 * The vault's session state, kept in memory only: no persist middleware, no devtools. The session key and the
 * pending (not yet confirmed) setup live in closure variables rather than in state, so a dump of the state
 * can never contain them.
 */
export function createVaultStore({ metaRepo, itemRepo, guard, now = Date.now }: VaultStoreDeps) {
  let session: VaultSession | null = null
  let pending: { meta: VaultMeta; session: VaultSession } | null = null
  let busy = false
  /** Ciphertext of the last removed item, for undo. It holds no plaintext, and is dropped on lock. */
  let lastRemoved: EncryptedItem | null = null

  const dropPending = () => {
    pending?.session.destroy()
    pending = null
  }

  const useStore = create<VaultState>()((set, get) => {
    const adopt = async (next: VaultSession, meta: VaultMeta) => {
      session?.destroy()
      session = next
      let itemCount: number | null = null
      try {
        itemCount = (await itemRepo.list()).length
      } catch {
        itemCount = null
      }
      lastRemoved = null
      set({ status: 'unlocked', meta, itemCount, items: [], itemsStatus: 'idle', unreadable: 0, unreadableIds: [], lockReason: null, announcement: 'Vault terbuka.' })
    }

    const refreshMeta = async (): Promise<VaultMeta | null> => {
      await settleInterruptedRotation({ metaRepo, itemRepo })
      const meta = await metaRepo.get()
      set({ meta, status: meta ? get().status : 'needs-setup' })
      return meta
    }

    const failure = (error: unknown): UnlockResult => {
      if (!isVaultError(error)) return { ok: false, error: 'unavailable' }
      if (error.code === 'bad-credentials') {
        const wait = guard.recordFailure()
        return wait > 0 ? { ok: false, error: 'wait', retryAt: now() + wait } : { ok: false, error: 'wrong' }
      }
      if (error.code === 'invalid-input') return { ok: false, error: 'invalid' }
      if (error.code === 'corrupt') return { ok: false, error: 'corrupt' }
      if (error.code === 'conflict') return { ok: false, error: 'conflict' }
      return { ok: false, error: 'unavailable' }
    }

    const waiting = (): UnlockResult | null => {
      const remaining = guard.remainingMs()
      return remaining > 0 ? { ok: false, error: 'wait', retryAt: now() + remaining } : null
    }

    return {
      status: 'loading',
      meta: null,
      itemCount: null,
      items: [],
      itemsStatus: 'idle',
      unreadable: 0,
      unreadableIds: [],
      lockReason: null,
      announcement: '',

      async init() {
        if (get().status === 'unlocked' || pending) return
        if (get().status === 'error') set({ status: 'loading' })
        try {
          const meta = await refreshMeta()
          // A vault that exists but cannot be read throws above and lands in 'error': it is never shown as "needs setup".
          set({ status: meta ? 'locked' : 'needs-setup' })
        } catch {
          set({ status: 'error', meta: null })
        }
      },

      async beginSetup(password) {
        if (get().status !== 'needs-setup') throw new VaultError('conflict')
        dropPending()
        const created = await createVault(password)
        pending = { meta: created.meta, session: created.session }
        return created.recoveryKey
      },

      async confirmSetup() {
        if (!pending || busy) return { ok: false, error: 'unavailable' }
        busy = true
        const current = pending
        try {
          await metaRepo.create(current.meta)
          pending = null
          await adopt(current.session, current.meta)
          return { ok: true }
        } catch (error) {
          if (isVaultError(error) && error.code === 'conflict') {
            // A vault appeared meanwhile (another tab). Nothing was overwritten; fall back to its lock screen.
            dropPending()
            set({ status: 'loading' })
            await get().init()
            return { ok: false, error: 'conflict' }
          }
          return { ok: false, error: 'unavailable' }
        } finally {
          busy = false
        }
      },

      cancelSetup: dropPending,

      async unlock(password) {
        if (busy) return { ok: false, error: 'busy' }
        const wait = waiting()
        if (wait) return wait
        busy = true
        try {
          const meta = await refreshMeta()
          if (!meta) return { ok: false, error: 'unavailable' }
          const next = await unlockWithPassword(meta, password)
          guard.recordSuccess()
          await adopt(next, meta)
          return { ok: true }
        } catch (error) {
          return failure(error)
        } finally {
          busy = false
        }
      },

      async unlockWithRecovery(recoveryKey, newPassword) {
        if (busy) return { ok: false, error: 'busy' }
        const wait = waiting()
        if (wait) return wait
        busy = true
        try {
          const meta = await refreshMeta()
          if (!meta) return { ok: false, error: 'unavailable' }
          const reset = await resetPasswordWithRecovery(meta, recoveryKey, newPassword)
          await metaRepo.update(reset.meta)
          guard.recordSuccess()
          await adopt(reset.session, reset.meta)
          return { ok: true }
        } catch (error) {
          return failure(error)
        } finally {
          busy = false
        }
      },

      lock(reason, idleMinutes = DEFAULT_IDLE_MINUTES) {
        // Drops the key and the decrypted items. Nothing else is needed: neither lives anywhere else.
        session?.destroy()
        session = null
        dropPending()
        const wasUnlocked = get().status === 'unlocked'
        lastRemoved = null
        set({
          items: [],
          itemsStatus: 'idle',
          unreadable: 0,
          unreadableIds: [],
          itemCount: null,
          ...(wasUnlocked ? { status: 'locked' as const, lockReason: reason, announcement: lockMessage(reason, idleMinutes) } : {}),
        })
      },

      async changePassword(currentPassword, newPassword) {
        if (!session) return { ok: false, error: 'unavailable' }
        if (busy) return { ok: false, error: 'busy' }
        const wait = waiting()
        if (wait) return wait
        busy = true
        try {
          const meta = await refreshMeta()
          if (!meta) return { ok: false, error: 'unavailable' }
          const next = await changeMasterPassword(meta, currentPassword, newPassword)
          await metaRepo.update(next)
          guard.recordSuccess()
          set({ meta: next, announcement: 'Kata sandi utama diganti.' })
          return { ok: true }
        } catch (error) {
          return failure(error)
        } finally {
          busy = false
        }
      },

      async rotateKey(password, onProgress) {
        if (!session) return { ok: false, error: 'unavailable' }
        if (busy) return { ok: false, error: 'busy' }
        const wait = waiting()
        if (wait) return wait
        busy = true
        try {
          const result = await rotateVaultKey({ metaRepo, itemRepo }, { password, onProgress })
          guard.recordSuccess()
          // The old key is gone: the new session replaces it, and an undo made under the old key can no longer be restored.
          session?.destroy()
          session = result.session
          lastRemoved = null
          set({ meta: result.meta, announcement: 'Kunci vault diganti.' })
          return { ok: true, recoveryKey: result.recoveryKey }
        } catch (error) {
          return failure(error)
        } finally {
          busy = false
        }
      },

      async exportBackup() {
        const meta = await metaRepo.get()
        if (!meta) throw new VaultError('corrupt')
        return exportBackupText(meta, await itemRepo.list())
      },

      async restoreBackup(text, password, onProgress) {
        if (busy) return { ok: false, error: 'busy' }
        if (get().status === 'loading') return { ok: false, error: 'unavailable' }
        const wait = waiting()
        if (wait) return wait
        busy = true
        try {
          const restored = await restoreBackupFile({ metaRepo, itemRepo }, { text, password, onProgress })
          guard.recordSuccess()
          lastRemoved = null
          dropPending()
          await adopt(restored.session, restored.meta)
          return { ok: true }
        } catch (error) {
          return failure(error)
        } finally {
          busy = false
        }
      },

      async removeUnreadable() {
        const active = session
        if (!active) return 0
        let removed = 0
        for (const id of get().unreadableIds) {
          await itemRepo.remove(id, active.keyEpoch)
          removed++
        }
        set({ itemsStatus: 'idle' })
        await get().loadItems()
        return removed
      },

      async loadItems() {
        const active = session
        if (!active || get().itemsStatus === 'loading') return
        set({ itemsStatus: 'loading' })
        try {
          const stored = await itemRepo.list()
          const items: VaultItem[] = []
          const unreadableIds: string[] = []
          for (const record of stored) {
            try {
              const payload = parsePayload(await openItem(active, record))
              if (payload) items.push({ ...payload, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt } as VaultItem)
              else unreadableIds.push(record.id)
            } catch {
              unreadableIds.push(record.id)
            }
          }
          if (session !== active) return // locked while decrypting: drop the result
          set({ items, unreadable: unreadableIds.length, unreadableIds, itemCount: stored.length, itemsStatus: 'ready' })
        } catch {
          if (session === active) set({ itemsStatus: 'error', items: [] })
        }
      },

      async saveItem(draft, id) {
        const active = session
        if (!active) return { ok: false, error: 'locked' }
        const message = validateDraft(draft)
        if (message) return { ok: false, error: 'invalid', message }
        const existing = id ? get().items.find((item) => item.id === id) ?? null : null
        if (id && !existing) return { ok: false, error: 'storage' }
        const now = new Date().toISOString()
        const payload: VaultItemPayload =
          draft.kind === 'login'
            ? { ...draft, passwordHistory: nextHistory(existing?.kind === 'login' ? (existing as LoginPayload) : null, draft.password, now) }
            : draft
        const itemId = id ?? newItemId()
        try {
          const sealed = await sealItem(active, { id: itemId, payload, createdAt: existing?.createdAt })
          await itemRepo.put(sealed, active.keyEpoch)
          if (session !== active) return { ok: false, error: 'locked' }
          const saved = { ...payload, id: itemId, createdAt: sealed.createdAt, updatedAt: sealed.updatedAt } as VaultItem
          set((state) => ({
            items: [...state.items.filter((item) => item.id !== itemId), saved],
            itemCount: existing ? state.itemCount : (state.itemCount ?? state.items.length) + 1,
          }))
          return { ok: true, id: itemId }
        } catch (error) {
          return { ok: false, error: isVaultError(error) && error.code === 'conflict' ? 'conflict' : 'storage' }
        }
      },

      async removeItem(id) {
        const active = session
        if (!active) return { ok: false, error: 'locked' }
        try {
          const record = await itemRepo.get(id)
          if (!record) return { ok: false, error: 'storage' }
          await itemRepo.remove(id, active.keyEpoch)
          lastRemoved = record
          set((state) => ({ items: state.items.filter((item) => item.id !== id), itemCount: Math.max(0, (state.itemCount ?? state.items.length) - 1) }))
          return { ok: true, id }
        } catch (error) {
          return { ok: false, error: isVaultError(error) && error.code === 'conflict' ? 'conflict' : 'storage' }
        }
      },

      async undoRemove() {
        const active = session
        const record = lastRemoved
        if (!active || !record) return { ok: false, error: 'locked' }
        try {
          await itemRepo.restore(record, active.keyEpoch)
          lastRemoved = null
          const payload = parsePayload(await openItem(active, record))
          if (payload && session === active) {
            const restored = { ...payload, id: record.id, createdAt: record.createdAt, updatedAt: record.updatedAt } as VaultItem
            set((state) => ({ items: [...state.items.filter((item) => item.id !== record.id), restored], itemCount: (state.itemCount ?? state.items.length) + 1 }))
          }
          return { ok: true, id: record.id }
        } catch (error) {
          return { ok: false, error: isVaultError(error) && error.code === 'conflict' ? 'conflict' : 'storage' }
        }
      },
    }
  })

  return { useStore, getSession: () => session, waitMs: () => guard.remainingMs() }
}

const vault = createVaultStore({ metaRepo: vaultMetaRepo, itemRepo: vaultItemRepo, guard: createUnlockGuard() })
export const useVaultStore = vault.useStore
/** Milliseconds left of the wait after failed attempts, 0 when unlocking is allowed. */
export const getVaultWaitMs = vault.waitMs
