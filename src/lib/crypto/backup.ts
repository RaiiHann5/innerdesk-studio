import { VaultError, isVaultError } from './errors'
import { openItem } from './items'
import { parseEncryptedItems, parseVaultMeta } from './schema'
import { rebindSession } from './session'
import { settleWithRetry, type VaultDeps } from './rotation'
import { unlockWithPassword } from './vault'
import type { EncryptedItem, VaultMeta } from './types'
import type { VaultSession } from './session'

export const BACKUP_FORMAT = 'innerdesk-vault-backup'
export const BACKUP_VERSION = 1
/** A vault of 10,000 items at the size limit would be larger, but nothing real is. This stops a hostile file. */
const MAX_BACKUP_CHARS = 40_000_000

export interface ParsedBackup {
  exportedAt: string
  meta: VaultMeta
  items: EncryptedItem[]
}

/** Ciphertext and meta only. Restoring it needs the master password that was current when it was exported. */
export function exportBackup(meta: VaultMeta, items: EncryptedItem[], now = new Date()): string {
  return JSON.stringify(
    { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), meta, items },
    null,
    2,
  )
}

export function parseBackup(text: string): ParsedBackup {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_CHARS) throw new VaultError('corrupt')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new VaultError('corrupt')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new VaultError('corrupt')
  const record = raw as Record<string, unknown>
  if (record.format !== BACKUP_FORMAT) throw new VaultError('corrupt')
  if (record.version !== BACKUP_VERSION) throw new VaultError('unsupported')
  const keys = Object.keys(record)
  if (keys.length !== 5 || !['exportedAt', 'meta', 'items'].every((key) => keys.includes(key))) throw new VaultError('corrupt')
  if (typeof record.exportedAt !== 'string' || Number.isNaN(Date.parse(record.exportedAt))) throw new VaultError('corrupt')
  return { exportedAt: record.exportedAt, meta: parseVaultMeta(record.meta), items: parseEncryptedItems(record.items) }
}

/**
 * Replaces the whole vault with the backup. The master password is checked, and every item must decrypt,
 * before anything is written. Writes use the same stage, commit, settle order as key rotation.
 * The caller must make the person confirm: this discards whatever vault is there now.
 */
export async function restoreBackup(
  { metaRepo, itemRepo }: VaultDeps,
  options: { text: string; password: string; onProgress?: (done: number, total: number) => void },
): Promise<{ meta: VaultMeta; session: VaultSession }> {
  const backup = parseBackup(options.text)
  const checkSession = await unlockWithPassword(backup.meta, options.password)
  try {
    options.onProgress?.(0, backup.items.length)
    let done = 0
    for (const item of backup.items) {
      await openItem(checkSession, item)
      options.onProgress?.(++done, backup.items.length)
    }

    // A vault that cannot be read is what a restore is for: it is replaced, but only after the backup was verified above.
    let existing: VaultMeta | null = null
    let damaged = false
    try {
      existing = await metaRepo.get()
    } catch (error) {
      if (!isVaultError(error) || error.code !== 'corrupt') throw error
      damaged = true
    }
    const keyEpoch = Math.max(existing?.keyEpoch ?? 0, backup.meta.keyEpoch) + 1
    const meta: VaultMeta = {
      ...backup.meta,
      keyEpoch,
      revision: (existing?.revision ?? 0) + 1,
      createdAt: existing?.createdAt ?? backup.meta.createdAt,
      updatedAt: new Date().toISOString(),
    }
    try {
      await itemRepo.stageReplace(backup.items, keyEpoch)
      if (damaged) await metaRepo.overwrite(meta)
      else if (existing) await metaRepo.update(meta)
      else await metaRepo.create(meta)
    } catch (error) {
      await itemRepo.discardStaged().catch(() => undefined)
      throw error
    }
    await settleWithRetry(itemRepo, keyEpoch)
    return { meta, session: rebindSession(checkSession, keyEpoch) }
  } catch (error) {
    checkSession.destroy()
    throw error
  }
}
