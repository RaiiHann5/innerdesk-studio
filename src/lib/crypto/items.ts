import { fromBase64, fromUtf8, randomBytes, toBase64, utf8, zero, type Bytes } from './bytes'
import { VaultError } from './errors'
import { IV_BYTES, subtle } from './keys'
import { ITEM_ID_PATTERN } from './schema'
import { sessionKey, type VaultSession } from './session'
import type { EncryptedItem } from './types'

/** Version of the plaintext payload layout. Part of the AAD, so it cannot be altered in storage. */
export const ITEM_SCHEMA_VERSION = 1
const PAD_BLOCK = 256
const LENGTH_PREFIX = 4
const MAX_PLAINTEXT_BYTES = 200_000

export const newItemId = (): string => globalThis.crypto.randomUUID()

/** Binds the ciphertext to its record: moving it to another id or version makes the GCM check fail. */
export const itemAad = (id: string, v: number): Bytes => utf8(`innerdesk-vault/item|v${v}|${id}`)

/**
 * [4-byte length][payload][zero padding] up to a multiple of 256 bytes, so a stored size does not reveal
 * whether a password is 8 or 40 characters long. The padding is encrypted along with everything else.
 */
function pad(payload: Bytes): Bytes {
  const total = Math.ceil((LENGTH_PREFIX + payload.length) / PAD_BLOCK) * PAD_BLOCK
  const out = new Uint8Array(total)
  new DataView(out.buffer).setUint32(0, payload.length)
  out.set(payload, LENGTH_PREFIX)
  return out
}

function unpad(padded: Uint8Array): Uint8Array {
  if (padded.length < LENGTH_PREFIX) throw new VaultError('corrupt')
  const length = new DataView(padded.buffer, padded.byteOffset, padded.byteLength).getUint32(0)
  if (length > padded.length - LENGTH_PREFIX) throw new VaultError('corrupt')
  return padded.subarray(LENGTH_PREFIX, LENGTH_PREFIX + length)
}

export interface SealInput {
  id: string
  /** Any JSON-serialisable value. The crypto layer does not know or care what an item looks like. */
  payload: unknown
  /** Keep the original on edit. Defaults to now. */
  createdAt?: string
  /** Rotation keeps the original; an edit uses the default of now. */
  updatedAt?: string
}

/** A fresh random 96-bit IV for every call, so an IV is never reused with the same key. */
export async function sealItem(session: VaultSession, input: SealInput): Promise<EncryptedItem> {
  const key = sessionKey(session)
  if (!ITEM_ID_PATTERN.test(input.id)) throw new VaultError('invalid-input')
  const json = JSON.stringify(input.payload)
  if (typeof json !== 'string') throw new VaultError('invalid-input')
  const plain = utf8(json)
  if (plain.length > MAX_PLAINTEXT_BYTES) {
    zero(plain)
    throw new VaultError('invalid-input')
  }
  const padded = pad(plain)
  zero(plain)
  const iv = randomBytes(IV_BYTES)
  try {
    const sealed = await subtle().encrypt(
      { name: 'AES-GCM', iv, additionalData: itemAad(input.id, ITEM_SCHEMA_VERSION) },
      key,
      padded,
    )
    const now = new Date().toISOString()
    return {
      id: input.id,
      v: ITEM_SCHEMA_VERSION,
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(sealed)),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    }
  } catch (error) {
    if (error instanceof VaultError) throw error
    throw new VaultError('storage')
  } finally {
    zero(padded)
  }
}

/** Returns the parsed JSON payload. Any authentication or format failure is a generic `corrupt`. */
export async function openItem(session: VaultSession, item: EncryptedItem): Promise<unknown> {
  const key = sessionKey(session)
  if (item.v !== ITEM_SCHEMA_VERSION) throw new VaultError('unsupported')
  let padded: Uint8Array | null = null
  try {
    padded = new Uint8Array(
      await subtle().decrypt(
        { name: 'AES-GCM', iv: fromBase64(item.iv), additionalData: itemAad(item.id, item.v) },
        key,
        fromBase64(item.ciphertext),
      ),
    )
    return JSON.parse(fromUtf8(unpad(padded)))
  } catch {
    throw new VaultError('corrupt')
  } finally {
    zero(padded)
  }
}
