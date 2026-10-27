import { byteLengthOfBase64 } from './bytes'
import { VaultError } from './errors'
import { IV_BYTES, MAX_KDF_ITERATIONS, KDF_NAME, MIN_KDF_ITERATIONS, SALT_BYTES } from './keys'
import type { EncryptedItem, KdfParams, VaultMeta, WrappedKey } from './types'

/**
 * Strict validators for anything read from storage or a backup file. Unknown fields are rejected, not
 * ignored: a record that carries extra data is not one this code wrote.
 */

export const VAULT_META_VERSION = 1
export const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
/** 32-byte key + 16-byte tag. */
const WRAPPED_VK_BYTES = 48
/** Smallest padded plaintext (256) plus the tag. */
const MIN_ITEM_CIPHERTEXT_BYTES = 272
export const MAX_ITEM_CIPHERTEXT_BYTES = 262_144 + 16
export const MAX_ITEMS = 10_000

type UnknownRecord = Record<string, unknown>
const corrupt = (): never => {
  throw new VaultError('corrupt')
}
const isRecord = (value: unknown): value is UnknownRecord => typeof value === 'object' && value !== null && !Array.isArray(value)

function exact(value: unknown, keys: string[]): UnknownRecord {
  if (!isRecord(value)) return corrupt()
  const present = Object.keys(value)
  if (present.length !== keys.length || !keys.every((key) => present.includes(key))) return corrupt()
  return value
}

const positiveInt = (value: unknown): number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : corrupt()

function isoDate(value: unknown): string {
  if (typeof value !== 'string' || value.length > 40 || Number.isNaN(Date.parse(value))) return corrupt()
  return value
}

function base64Of(value: unknown, bytes?: { exactly?: number; min?: number; max?: number }): string {
  if (typeof value !== 'string') return corrupt()
  const length = byteLengthOfBase64(value)
  if (bytes?.exactly !== undefined && length !== bytes.exactly) return corrupt()
  if (bytes?.min !== undefined && length < bytes.min) return corrupt()
  if (bytes?.max !== undefined && length > bytes.max) return corrupt()
  return value
}

function parseWrappedKey(value: unknown): WrappedKey {
  const record = exact(value, ['iv', 'ciphertext'])
  return { iv: base64Of(record.iv, { exactly: IV_BYTES }), ciphertext: base64Of(record.ciphertext, { exactly: WRAPPED_VK_BYTES }) }
}

function parseKdf(value: unknown): KdfParams {
  const record = exact(value, ['name', 'iterations', 'salt'])
  const iterations = record.iterations
  if (
    record.name !== KDF_NAME ||
    typeof iterations !== 'number' ||
    !Number.isInteger(iterations) ||
    iterations < MIN_KDF_ITERATIONS ||
    iterations > MAX_KDF_ITERATIONS
  ) {
    return corrupt()
  }
  return { name: KDF_NAME, iterations, salt: base64Of(record.salt, { exactly: SALT_BYTES }) }
}

export function parseVaultMeta(value: unknown): VaultMeta {
  if (isRecord(value) && value.version !== VAULT_META_VERSION && 'version' in value) throw new VaultError('unsupported')
  const record = exact(value, [
    'version',
    'revision',
    'keyEpoch',
    'kdf',
    'wrappedVkByPassword',
    'wrappedVkByRecovery',
    'createdAt',
    'updatedAt',
  ])
  return {
    version: VAULT_META_VERSION,
    revision: positiveInt(record.revision),
    keyEpoch: positiveInt(record.keyEpoch),
    kdf: parseKdf(record.kdf),
    wrappedVkByPassword: parseWrappedKey(record.wrappedVkByPassword),
    wrappedVkByRecovery: parseWrappedKey(record.wrappedVkByRecovery),
    createdAt: isoDate(record.createdAt),
    updatedAt: isoDate(record.updatedAt),
  }
}

export function parseEncryptedItem(value: unknown): EncryptedItem {
  const record = exact(value, ['id', 'v', 'iv', 'ciphertext', 'createdAt', 'updatedAt'])
  if (typeof record.id !== 'string' || !ITEM_ID_PATTERN.test(record.id)) return corrupt()
  return {
    id: record.id,
    v: positiveInt(record.v),
    iv: base64Of(record.iv, { exactly: IV_BYTES }),
    ciphertext: base64Of(record.ciphertext, { min: MIN_ITEM_CIPHERTEXT_BYTES, max: MAX_ITEM_CIPHERTEXT_BYTES }),
    createdAt: isoDate(record.createdAt),
    updatedAt: isoDate(record.updatedAt),
  }
}

export function parseEncryptedItems(value: unknown): EncryptedItem[] {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) return corrupt()
  const items = value.map(parseEncryptedItem)
  if (new Set(items.map((item) => item.id)).size !== items.length) return corrupt()
  return items
}
