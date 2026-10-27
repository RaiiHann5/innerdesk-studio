/**
 * Every failure in the vault is one of these codes. The message is deliberately generic: it never
 * contains a payload, a key, a password, or the underlying WebCrypto error. Callers branch on `code`.
 */
export type VaultErrorCode =
  | 'bad-credentials' // wrong master password or recovery key (the AES-GCM unwrap failed)
  | 'corrupt' // stored data fails validation or authentication
  | 'unsupported' // newer schema version, or WebCrypto is unavailable (for example an insecure context)
  | 'invalid-input' // caller passed something unusable (too-short password, malformed recovery key)
  | 'locked' // the session was destroyed
  | 'conflict' // another tab changed the vault first
  | 'storage' // the storage backend failed

const MESSAGES: Record<VaultErrorCode, string> = {
  'bad-credentials': 'Vault tidak bisa dibuka.',
  corrupt: 'Vault tidak bisa dibuka.',
  unsupported: 'Vault tidak bisa dibuka.',
  'invalid-input': 'Input tidak valid.',
  locked: 'Vault terkunci.',
  conflict: 'Vault berubah di tab lain. Muat ulang lalu coba lagi.',
  storage: 'Penyimpanan vault gagal.',
}

export class VaultError extends Error {
  readonly code: VaultErrorCode
  constructor(code: VaultErrorCode) {
    super(MESSAGES[code])
    this.name = 'VaultError'
    this.code = code
  }
}

export const isVaultError = (error: unknown): error is VaultError => error instanceof VaultError
