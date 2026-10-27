import { VaultError } from './errors'
import type { Bytes } from './bytes'

/** Crockford base32: no I, L, O or U, so a written-down key is hard to misread. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function encodeBase32(bytes: Uint8Array): string {
  let bits = 0
  let value = 0
  let out = ''
  for (const byte of bytes) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
    value &= (1 << bits) - 1
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31]
  return out
}

/** Accepts lower case, spaces, hyphens, and the usual misreads (O for 0, I or L for 1). */
export function decodeBase32(text: string, expectedBytes: number): Bytes {
  const clean = text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
  const expectedChars = Math.ceil((expectedBytes * 8) / 5)
  if (clean.length !== expectedChars) throw new VaultError('invalid-input')
  const out = new Uint8Array(expectedBytes)
  let bits = 0
  let value = 0
  let index = 0
  for (const char of clean) {
    const digit = ALPHABET.indexOf(char)
    if (digit === -1) throw new VaultError('invalid-input')
    value = (value << 5) | digit
    bits += 5
    if (bits >= 8) {
      out[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
    value &= (1 << bits) - 1
  }
  return out
}
