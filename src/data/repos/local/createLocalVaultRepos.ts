import { STORAGE_PREFIX } from '@/lib/config'
import { VaultError } from '@/lib/crypto/errors'
import { parseEncryptedItem, parseEncryptedItems, parseVaultMeta } from '@/lib/crypto/schema'
import type { EncryptedItem, VaultMeta } from '@/lib/crypto/types'
import type { VaultItemRepo, VaultMetaRepo } from '../interfaces'

/**
 * localStorage mocks of the two vault repos. They store ciphertext and wrapped keys only.
 *
 * Unlike `readJSON`, reads here are strict: a value that is present but unreadable throws `corrupt`
 * instead of looking like "nothing stored", so a damaged vault can never be mistaken for an empty one
 * and overwritten by Setup.
 */
const META_KEY = STORAGE_PREFIX + 'vault-meta'
const ITEMS_KEY = STORAGE_PREFIX + 'vault-items'
const STAGED_KEY = STORAGE_PREFIX + 'vault-items-staged'

function readRaw(key: string): unknown | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(key)
  } catch {
    throw new VaultError('storage')
  }
  if (raw === null) return null
  try {
    return JSON.parse(raw)
  } catch {
    throw new VaultError('corrupt')
  }
}

function writeRaw(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    throw new VaultError('storage')
  }
}

function removeRaw(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    throw new VaultError('storage')
  }
}

function exists(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null
  } catch {
    throw new VaultError('storage')
  }
}

/** A set of items together with the key epoch it was encrypted under. */
interface Envelope {
  keyEpoch: number
  items: EncryptedItem[]
}

function readEnvelope(key: string): Envelope | null {
  const raw = readRaw(key)
  if (raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new VaultError('corrupt')
  const record = raw as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.length !== 2 || !keys.includes('keyEpoch') || !keys.includes('items')) throw new VaultError('corrupt')
  const epoch = record.keyEpoch
  if (typeof epoch !== 'number' || !Number.isSafeInteger(epoch) || epoch < 1) throw new VaultError('corrupt')
  return { keyEpoch: epoch, items: parseEncryptedItems(record.items) }
}

export function createLocalVaultMetaRepo(): VaultMetaRepo {
  return {
    async get() {
      const raw = readRaw(META_KEY)
      return raw === null ? null : parseVaultMeta(raw)
    },
    async create(meta) {
      if (exists(META_KEY)) throw new VaultError('conflict')
      writeRaw(META_KEY, parseVaultMeta(meta))
    },
    async update(meta) {
      const next = parseVaultMeta(meta)
      const raw = readRaw(META_KEY)
      if (raw === null) throw new VaultError('conflict')
      const current: VaultMeta = parseVaultMeta(raw)
      if (next.revision !== current.revision + 1 || next.keyEpoch < current.keyEpoch) throw new VaultError('conflict')
      writeRaw(META_KEY, next)
    },
    async overwrite(meta) {
      writeRaw(META_KEY, parseVaultMeta(meta))
    },
  }
}

export function createLocalVaultItemRepo(): VaultItemRepo {
  /** A write is only valid against the epoch of the stored set. An absent set accepts the first epoch it is given. */
  const writable = (keyEpoch: number): Envelope => {
    const stored = readEnvelope(ITEMS_KEY)
    if (!stored) return { keyEpoch, items: [] }
    if (stored.keyEpoch !== keyEpoch) throw new VaultError('conflict')
    return stored
  }

  return {
    async list() {
      return readEnvelope(ITEMS_KEY)?.items ?? []
    },
    async get(id) {
      return readEnvelope(ITEMS_KEY)?.items.find((item) => item.id === id) ?? null
    },
    async put(item, keyEpoch) {
      const clean = parseEncryptedItem(item)
      const current = writable(keyEpoch)
      const others = current.items.filter((existing) => existing.id !== clean.id)
      writeRaw(ITEMS_KEY, { keyEpoch, items: [...others, clean] })
    },
    async remove(id, keyEpoch) {
      const current = writable(keyEpoch)
      writeRaw(ITEMS_KEY, { keyEpoch, items: current.items.filter((item) => item.id !== id) })
    },
    async restore(item, keyEpoch) {
      const clean = parseEncryptedItem(item)
      const current = writable(keyEpoch)
      if (current.items.some((existing) => existing.id === clean.id)) throw new VaultError('conflict')
      writeRaw(ITEMS_KEY, { keyEpoch, items: [...current.items, clean] })
    },
    async stageReplace(items, keyEpoch) {
      writeRaw(STAGED_KEY, { keyEpoch, items: parseEncryptedItems(items) })
    },
    async settle(currentKeyEpoch) {
      if (!exists(STAGED_KEY)) return
      let staged: Envelope | null = null
      try {
        staged = readEnvelope(STAGED_KEY)
      } catch (error) {
        // A damaged staged set is leftover work, not data. The live set is what counts.
        if (!(error instanceof VaultError) || error.code === 'storage') throw error
      }
      let live: Envelope | null = null
      let liveDamaged = false
      try {
        live = readEnvelope(ITEMS_KEY)
      } catch (error) {
        // A live set that cannot be read is replaced by a staged set that matches the vault (a restore), never the reverse.
        if (!(error instanceof VaultError) || error.code === 'storage') throw error
        liveDamaged = true
      }
      if (staged && staged.keyEpoch === currentKeyEpoch && (liveDamaged || !live || live.keyEpoch < staged.keyEpoch)) {
        writeRaw(ITEMS_KEY, staged)
      }
      removeRaw(STAGED_KEY)
    },
    async discardStaged() {
      removeRaw(STAGED_KEY)
    },
  }
}
