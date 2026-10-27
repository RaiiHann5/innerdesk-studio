/** A PIN is 4 to 8 digits. It only gates the screen, so the length is a convenience rather than a security margin. */
export const PIN_PATTERN = /^\d{4,8}$/

export interface PinRecord {
  salt: string
  hash: string
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')

/** SHA-256 where the browser offers it (secure contexts), otherwise a small non-cryptographic hash. */
async function digest(text: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle) return toHex(new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(text))))
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16).padStart(8, '0')
}

export async function createPin(pin: string): Promise<PinRecord> {
  const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(8)))
  return { salt, hash: await digest(`${salt}:${pin}`) }
}

export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  return (await digest(`${record.salt}:${pin}`)) === record.hash
}
