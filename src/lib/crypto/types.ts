/** AES-GCM output stored as base64. `iv` is 12 bytes; `ciphertext` includes the 16-byte tag. */
export interface WrappedKey {
  iv: string
  ciphertext: string
}

export interface KdfParams {
  name: 'PBKDF2-SHA256'
  iterations: number
  /** base64, 16 random bytes. Fresh on every master-password change. */
  salt: string
}

/**
 * The one vault-wide record. Holds no secret that works without the master password or recovery key.
 *
 * `revision` and `keyEpoch` are additions to the minimum shape, and both exist for safety:
 * - `revision` increases on every change, so a write from a stale tab is rejected instead of overwriting.
 * - `keyEpoch` increases when the vault key changes (rotation, restore). Items are written against an epoch,
 *   so a stale tab cannot add an item encrypted under a retired key, and an interrupted rotation can be
 *   settled deterministically.
 */
export interface VaultMeta {
  version: 1
  revision: number
  keyEpoch: number
  kdf: KdfParams
  wrappedVkByPassword: WrappedKey
  wrappedVkByRecovery: WrappedKey
  createdAt: string
  updatedAt: string
}

/**
 * Everything a repository may store for one item, and nothing else. No title, kind, tag or URL
 * lives outside the ciphertext: a database dump shows ids, sizes and timestamps only.
 */
export interface EncryptedItem {
  /** Chosen by the client before encryption, because it is part of the AAD. */
  id: string
  /** Schema version of the plaintext payload. Also part of the AAD. */
  v: number
  /** base64, 12 random bytes, fresh for every write. */
  iv: string
  /** base64, AES-256-GCM output including the tag. */
  ciphertext: string
  createdAt: string
  updatedAt: string
}
