import { VaultError } from './errors'

/** Always backed by a plain ArrayBuffer, which is what WebCrypto's BufferSource typing wants. */
export type Bytes = Uint8Array<ArrayBuffer>

const encoder = new TextEncoder()
const decoder = new TextDecoder('utf-8', { fatal: true })

export const utf8 = (text: string): Bytes => encoder.encode(text) as Bytes
/** Throws on invalid UTF-8 rather than substituting characters. */
export const fromUtf8 = (bytes: Uint8Array): string => decoder.decode(bytes)

export function randomBytes(length: number): Bytes {
  const out = new Uint8Array(length)
  globalThis.crypto.getRandomValues(out)
  return out
}

/** Best-effort wipe. JavaScript gives no guarantee that copies of the data are not left elsewhere in memory. */
export function zero(...buffers: Array<Uint8Array | null | undefined>): void {
  for (const buffer of buffers) buffer?.fill(0)
}

export function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

const BASE64 = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function fromBase64(text: string): Bytes {
  if (typeof text !== 'string' || !BASE64.test(text)) throw new VaultError('corrupt')
  const binary = atob(text)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

export const byteLengthOfBase64 = (text: string): number => fromBase64(text).length
