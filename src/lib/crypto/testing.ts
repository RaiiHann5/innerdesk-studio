import { vi } from 'vitest'
import { fromBase64, toBase64 } from './bytes'

/** Flips one bit of a base64 value at a byte position. */
export function flipByte(base64: string, position: number): string {
  const bytes = fromBase64(base64)
  bytes[position === -1 ? bytes.length - 1 : position] ^= 1
  return toBase64(bytes)
}

/** An in-memory localStorage. `failWrites` makes every write throw, like a full or blocked disk. */
export function installMemoryStorage() {
  const memory = new Map<string, string>()
  const state = { failWrites: false }
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (state.failWrites) throw new Error('quota')
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
  })
  return { memory, state }
}

/** Any use of browser storage fails the test. For code that must never touch it. */
export function installForbiddenStorage() {
  const forbid = () => {
    throw new Error('browser storage must not be used here')
  }
  const trap = { getItem: forbid, setItem: forbid, removeItem: forbid, clear: forbid, key: forbid, length: 0 }
  vi.stubGlobal('localStorage', trap)
  vi.stubGlobal('sessionStorage', trap)
}
