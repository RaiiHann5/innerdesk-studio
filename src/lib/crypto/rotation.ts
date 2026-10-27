import type { VaultItemRepo, VaultMetaRepo } from '@/data/repos/interfaces'
import { VaultError } from './errors'
import { openItem, sealItem } from './items'
import { generateVaultKey } from './keys'
import { provisionKeys, unlockWithPassword } from './vault'
import { VaultSession } from './session'
import type { EncryptedItem, VaultMeta } from './types'

export interface VaultDeps {
  metaRepo: VaultMetaRepo
  itemRepo: VaultItemRepo
}

/**
 * Call before every unlock. If a rotation or restore was interrupted after the meta record was updated but
 * before the new item set went live, this finishes it; if it was interrupted earlier, this discards the
 * staged set. In both cases the vault ends up consistent.
 */
export async function settleInterruptedRotation({ metaRepo, itemRepo }: VaultDeps): Promise<void> {
  const meta = await metaRepo.get()
  if (!meta) await itemRepo.discardStaged()
  else await itemRepo.settle(meta.keyEpoch)
}

const sameSet = (a: EncryptedItem[], b: EncryptedItem[]): boolean => {
  if (a.length !== b.length) return false
  const byId = new Map(b.map((item) => [item.id, item]))
  return a.every((item) => {
    const other = byId.get(item.id)
    return other !== undefined && other.iv === item.iv && other.ciphertext === item.ciphertext
  })
}

export interface RotationResult {
  meta: VaultMeta
  session: VaultSession
  /** A NEW recovery key, to be shown once. The previous one no longer works. */
  recoveryKey: string
}

/**
 * Replaces the vault key: a new key, a new salt and a new recovery key, then every item re-encrypted.
 * It asks for the master password again, so a person with brief access to an unlocked screen cannot start it.
 *
 * All-or-nothing, in this order:
 *   1. re-encrypt every item in memory and check each one decrypts under the new key;
 *   2. stage the complete new set beside the live one (the live set is untouched);
 *   3. update the meta record: the single commit point, rejected if the vault changed meanwhile;
 *   4. settle: the staged set goes live.
 * A failure before step 3 changes nothing. A crash between 3 and 4 is finished by `settleInterruptedRotation`.
 */
export async function rotateVaultKey(
  { metaRepo, itemRepo }: VaultDeps,
  options: { password: string; onProgress?: (done: number, total: number) => void },
): Promise<RotationResult> {
  const meta = await metaRepo.get()
  if (!meta) throw new VaultError('corrupt')
  const items = await itemRepo.list()
  const oldSession = await unlockWithPassword(meta, options.password)
  let newSession: VaultSession | null = null
  try {
    const nextEpoch = meta.keyEpoch + 1
    const provisioned = await provisionKeys(options.password, await generateVaultKey())
    newSession = new VaultSession(provisioned.sessionKey, nextEpoch)

    const sealed: EncryptedItem[] = []
    options.onProgress?.(0, items.length)
    for (const item of items) {
      const payload = await openItem(oldSession, item)
      const next = await sealItem(newSession, { id: item.id, payload, createdAt: item.createdAt, updatedAt: item.updatedAt })
      await openItem(newSession, next)
      sealed.push(next)
      options.onProgress?.(sealed.length, items.length)
    }

    // Something changed an item while this ran (another tab): abort rather than drop that change.
    if (!sameSet(items, await itemRepo.list())) throw new VaultError('conflict')

    const nextMeta: VaultMeta = {
      ...meta,
      revision: meta.revision + 1,
      keyEpoch: nextEpoch,
      kdf: provisioned.kdf,
      wrappedVkByPassword: provisioned.wrappedVkByPassword,
      wrappedVkByRecovery: provisioned.wrappedVkByRecovery,
      updatedAt: new Date().toISOString(),
    }
    try {
      await itemRepo.stageReplace(sealed, nextEpoch)
      await metaRepo.update(nextMeta)
    } catch (error) {
      await itemRepo.discardStaged().catch(() => undefined)
      throw error
    }
    await settleWithRetry(itemRepo, nextEpoch)
    return { meta: nextMeta, session: newSession, recoveryKey: provisioned.recoveryKey }
  } catch (error) {
    newSession?.destroy()
    throw error
  } finally {
    oldSession.destroy()
  }
}

/** The meta record is already committed here, so a failure is retried once and otherwise left to the next unlock. */
export async function settleWithRetry(itemRepo: VaultItemRepo, keyEpoch: number): Promise<void> {
  try {
    await itemRepo.settle(keyEpoch)
  } catch {
    await itemRepo.settle(keyEpoch)
  }
}
