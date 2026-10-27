import { VaultError } from './errors'
import { fromBase64, randomBytes, toBase64, utf8, zero, type Bytes } from './bytes'
import type { KdfParams, WrappedKey } from './types'

export const KDF_NAME = 'PBKDF2-SHA256' as const
/** OWASP's current figure for PBKDF2-HMAC-SHA-256. Stored per vault, so it can be raised later. */
export const DEFAULT_KDF_ITERATIONS = 600_000
/** A stored value below this is treated as tampering, so nobody can quietly weaken the stretching. */
export const MIN_KDF_ITERATIONS = 600_000
/** Above this a tampered record could freeze the tab for minutes. */
export const MAX_KDF_ITERATIONS = 10_000_000
export const SALT_BYTES = 16
export const IV_BYTES = 12
export const MIN_MASTER_PASSWORD_LENGTH = 12

const RECOVERY_SALT = utf8('innerdesk-vault/recovery-salt/v1')
const RECOVERY_INFO = utf8('innerdesk-vault/recovery-kek/v1')

export function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle
  if (!api) throw new VaultError('unsupported')
  return api
}

/** NFKC so the same passphrase typed on another keyboard or OS derives the same key. */
export const normalizePassword = (password: string): string => password.normalize('NFKC')

/** Length rule only. Strength feedback is the UI's job; there are no composition rules. */
export function assertMasterPassword(password: string): void {
  if ([...normalizePassword(password)].length < MIN_MASTER_PASSWORD_LENGTH) throw new VaultError('invalid-input')
}

export function newKdfParams(iterations = DEFAULT_KDF_ITERATIONS): KdfParams {
  return { name: KDF_NAME, iterations, salt: toBase64(randomBytes(SALT_BYTES)) }
}

export function assertKdfParams(kdf: KdfParams): void {
  if (
    kdf.name !== KDF_NAME ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations < MIN_KDF_ITERATIONS ||
    kdf.iterations > MAX_KDF_ITERATIONS ||
    fromBase64(kdf.salt).length !== SALT_BYTES
  ) {
    throw new VaultError('corrupt')
  }
}

/** The KEK never leaves WebCrypto: it is non-extractable and can only wrap and unwrap. */
export async function deriveKekFromPassword(password: string, kdf: KdfParams): Promise<CryptoKey> {
  assertKdfParams(kdf)
  const raw = utf8(normalizePassword(password))
  try {
    const base = await subtle().importKey('raw', raw, 'PBKDF2', false, ['deriveKey'])
    return await subtle().deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(kdf.salt), iterations: kdf.iterations },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey'],
    )
  } catch (error) {
    if (error instanceof VaultError) throw error
    throw new VaultError('bad-credentials')
  } finally {
    zero(raw)
  }
}

export async function deriveKekFromRecovery(recoveryKey: Bytes): Promise<CryptoKey> {
  try {
    const base = await subtle().importKey('raw', recoveryKey, 'HKDF', false, ['deriveKey'])
    return await subtle().deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: RECOVERY_SALT, info: RECOVERY_INFO },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['wrapKey', 'unwrapKey'],
    )
  } catch (error) {
    if (error instanceof VaultError) throw error
    throw new VaultError('bad-credentials')
  }
}

/** The KDF parameters are authenticated, so they cannot be swapped without breaking the unwrap. */
export const passwordWrapAad = (kdf: KdfParams): Bytes =>
  utf8(`innerdesk-vault/wrap/v1|password|${kdf.name}|${kdf.iterations}|${kdf.salt}`)
export const recoveryWrapAad = (): Bytes => utf8('innerdesk-vault/wrap/v1|recovery')

/** Generated extractable only so it can be wrapped. Callers keep the reference as briefly as possible. */
export const generateVaultKey = (): Promise<CryptoKey> =>
  subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])

export async function wrapVaultKey(vk: CryptoKey, kek: CryptoKey, aad: Bytes): Promise<WrappedKey> {
  const iv = randomBytes(IV_BYTES)
  const wrapped = await subtle().wrapKey('raw', vk, kek, { name: 'AES-GCM', iv, additionalData: aad })
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(wrapped)) }
}

/**
 * Wrong key, wrong AAD or altered bytes all fail the GCM check, which is how a wrong password is detected.
 * Pass `extractable: false` for a session key; `true` only to wrap it again under a different KEK.
 */
export async function unwrapVaultKey(wrapped: WrappedKey, kek: CryptoKey, aad: Bytes, extractable: boolean): Promise<CryptoKey> {
  try {
    return await subtle().unwrapKey(
      'raw',
      fromBase64(wrapped.ciphertext),
      kek,
      { name: 'AES-GCM', iv: fromBase64(wrapped.iv), additionalData: aad },
      { name: 'AES-GCM', length: 256 },
      extractable,
      ['encrypt', 'decrypt'],
    )
  } catch {
    throw new VaultError('bad-credentials')
  }
}
