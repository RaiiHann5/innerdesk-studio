import { encodeBase32, decodeBase32 } from './base32'
import { randomBytes, type Bytes } from './bytes'

/** 160 bits. Needs no stretching: it is already as strong as the 256-bit key it protects is practical to attack. */
export const RECOVERY_KEY_BYTES = 20

export const generateRecoveryKeyBytes = (): Bytes => randomBytes(RECOVERY_KEY_BYTES)

/** 32 base32 characters in 8 groups of 4: XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX. */
export function formatRecoveryKey(bytes: Uint8Array): string {
  return encodeBase32(bytes).match(/.{1,4}/g)!.join('-')
}

/** Throws `invalid-input` when the text is not a well-formed key. A well-formed but wrong key fails later, at unwrap. */
export const parseRecoveryKey = (text: string): Bytes => decodeBase32(text, RECOVERY_KEY_BYTES)
