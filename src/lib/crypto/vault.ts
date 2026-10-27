import { zero } from './bytes'
import { formatRecoveryKey, generateRecoveryKeyBytes, parseRecoveryKey } from './recovery'
import {
  DEFAULT_KDF_ITERATIONS,
  assertMasterPassword,
  deriveKekFromPassword,
  deriveKekFromRecovery,
  generateVaultKey,
  newKdfParams,
  passwordWrapAad,
  recoveryWrapAad,
  unwrapVaultKey,
  wrapVaultKey,
} from './keys'
import { parseVaultMeta, VAULT_META_VERSION } from './schema'
import { VaultSession } from './session'
import type { KdfParams, VaultMeta, WrappedKey } from './types'

export interface Provisioned {
  kdf: KdfParams
  wrappedVkByPassword: WrappedKey
  wrappedVkByRecovery: WrappedKey
  /** Shown to the person once. Never stored. */
  recoveryKey: string
  /** Non-extractable key for the new session. */
  sessionKey: CryptoKey
}

/**
 * Wraps `vk` under a fresh password KEK and a fresh recovery KEK, and checks both wraps by unwrapping them.
 * The session key comes from unwrapping with extractable=false, so the key that was usable as raw
 * material only ever existed in the caller's `vk` variable.
 */
export async function provisionKeys(password: string, vk: CryptoKey, iterations = DEFAULT_KDF_ITERATIONS): Promise<Provisioned> {
  assertMasterPassword(password)
  const kdf = newKdfParams(iterations)
  const recoveryBytes = generateRecoveryKeyBytes()
  try {
    const [passwordKek, recoveryKek] = await Promise.all([deriveKekFromPassword(password, kdf), deriveKekFromRecovery(recoveryBytes)])
    const wrappedVkByPassword = await wrapVaultKey(vk, passwordKek, passwordWrapAad(kdf))
    const wrappedVkByRecovery = await wrapVaultKey(vk, recoveryKek, recoveryWrapAad())
    await unwrapVaultKey(wrappedVkByRecovery, recoveryKek, recoveryWrapAad(), false)
    const sessionKey = await unwrapVaultKey(wrappedVkByPassword, passwordKek, passwordWrapAad(kdf), false)
    return { kdf, wrappedVkByPassword, wrappedVkByRecovery, recoveryKey: formatRecoveryKey(recoveryBytes), sessionKey }
  } finally {
    zero(recoveryBytes)
  }
}

export interface CreatedVault {
  meta: VaultMeta
  /** The recovery key, in text form. The caller must show it once and make the person confirm they saved it. */
  recoveryKey: string
  session: VaultSession
}

export async function createVault(password: string): Promise<CreatedVault> {
  assertMasterPassword(password)
  const vk = await generateVaultKey()
  const provisioned = await provisionKeys(password, vk)
  const now = new Date().toISOString()
  const meta: VaultMeta = {
    version: VAULT_META_VERSION,
    revision: 1,
    keyEpoch: 1,
    kdf: provisioned.kdf,
    wrappedVkByPassword: provisioned.wrappedVkByPassword,
    wrappedVkByRecovery: provisioned.wrappedVkByRecovery,
    createdAt: now,
    updatedAt: now,
  }
  return { meta, recoveryKey: provisioned.recoveryKey, session: new VaultSession(provisioned.sessionKey, meta.keyEpoch) }
}

/** Throws `bad-credentials` for a wrong password. There is no stored password hash to compare against. */
export async function unlockWithPassword(meta: VaultMeta, password: string): Promise<VaultSession> {
  const checked = parseVaultMeta(meta)
  const kek = await deriveKekFromPassword(password, checked.kdf)
  const key = await unwrapVaultKey(checked.wrappedVkByPassword, kek, passwordWrapAad(checked.kdf), false)
  return new VaultSession(key, checked.keyEpoch)
}

export async function unlockWithRecovery(meta: VaultMeta, recoveryKey: string): Promise<VaultSession> {
  const checked = parseVaultMeta(meta)
  const bytes = parseRecoveryKey(recoveryKey)
  try {
    const kek = await deriveKekFromRecovery(bytes)
    const key = await unwrapVaultKey(checked.wrappedVkByRecovery, kek, recoveryWrapAad(), false)
    return new VaultSession(key, checked.keyEpoch)
  } finally {
    zero(bytes)
  }
}

/** New salt, current iteration count (never lower than the stored one), same vault key. Items are not touched. */
async function rewrapForPassword(meta: VaultMeta, vk: CryptoKey, newPassword: string): Promise<{ meta: VaultMeta; sessionKey: CryptoKey }> {
  const kdf = newKdfParams(Math.max(DEFAULT_KDF_ITERATIONS, meta.kdf.iterations))
  const kek = await deriveKekFromPassword(newPassword, kdf)
  const wrappedVkByPassword = await wrapVaultKey(vk, kek, passwordWrapAad(kdf))
  // Unwrapping straight away proves the new wrap works, and yields the non-extractable session key.
  const sessionKey = await unwrapVaultKey(wrappedVkByPassword, kek, passwordWrapAad(kdf), false)
  return { meta: { ...meta, kdf, wrappedVkByPassword, revision: meta.revision + 1, updatedAt: new Date().toISOString() }, sessionKey }
}

/**
 * Re-wraps the vault key under a new password. Items stay as they are, and so does the recovery key.
 * Returns the new meta; the caller writes it with `metaRepo.update`, which rejects a stale revision.
 */
export async function changePassword(meta: VaultMeta, oldPassword: string, newPassword: string): Promise<VaultMeta> {
  assertMasterPassword(newPassword)
  const checked = parseVaultMeta(meta)
  const oldKek = await deriveKekFromPassword(oldPassword, checked.kdf)
  // Extractable only for the length of this function: it has to be wrapped again.
  const vk = await unwrapVaultKey(checked.wrappedVkByPassword, oldKek, passwordWrapAad(checked.kdf), true)
  return (await rewrapForPassword(checked, vk, newPassword)).meta
}

/** For a forgotten password. Needs the recovery key and sets a new password; the recovery key stays valid. */
export async function resetPasswordWithRecovery(
  meta: VaultMeta,
  recoveryKey: string,
  newPassword: string,
): Promise<{ meta: VaultMeta; session: VaultSession }> {
  assertMasterPassword(newPassword)
  const checked = parseVaultMeta(meta)
  const bytes = parseRecoveryKey(recoveryKey)
  try {
    const recoveryKek = await deriveKekFromRecovery(bytes)
    const vk = await unwrapVaultKey(checked.wrappedVkByRecovery, recoveryKek, recoveryWrapAad(), true)
    const { meta: next, sessionKey } = await rewrapForPassword(checked, vk, newPassword)
    return { meta: next, session: new VaultSession(sessionKey, next.keyEpoch) }
  } finally {
    zero(bytes)
  }
}
