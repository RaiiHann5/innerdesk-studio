/**
 * The PLAINTEXT shape of a vault item. It exists only inside features/vault, in memory, after decryption.
 * Nothing under src/data may import this file: the data layer sees `EncryptedItem` and nothing else
 * (enforced by src/features/vault/boundary.test.ts).
 *
 * There is deliberately no TOTP/2FA kind (storing the second factor next to the password defeats it)
 * and no payment card kind.
 */
export type VaultItemKind = 'login' | 'apiKey' | 'secureNote' | 'wifi'

/** A previous password, kept encrypted inside the item. The newest 5 are kept. */
export interface PasswordHistoryEntry {
  password: string
  /** ISO datetime the password was replaced. */
  replacedAt: string
}

export interface LoginPayload {
  kind: 'login'
  title: string
  username: string
  password: string
  urls: string[]
  notes: string
  tags: string[]
  passwordHistory: PasswordHistoryEntry[]
  favorite: boolean
}

export interface ApiKeyPayload {
  kind: 'apiKey'
  title: string
  service: string
  key: string
  notes: string
  /** yyyy-MM-dd */
  expiresAt?: string
  tags: string[]
  favorite: boolean
}

export interface SecureNotePayload {
  kind: 'secureNote'
  title: string
  /** Plain text. No rich text, so nothing is rendered as HTML. */
  body: string
  tags: string[]
  favorite: boolean
}

export type WifiSecurity = 'WPA3' | 'WPA2' | 'WPA' | 'WEP' | 'open'

export interface WifiPayload {
  kind: 'wifi'
  ssid: string
  password: string
  security: WifiSecurity
  notes: string
}

/** What gets JSON-serialised and sealed. */
export type VaultItemPayload = LoginPayload | ApiKeyPayload | SecureNotePayload | WifiPayload

/** A decrypted item as the vault store holds it in memory. */
export type VaultItem = VaultItemPayload & {
  id: string
  createdAt: string
  updatedAt: string
}

export const PASSWORD_HISTORY_LIMIT = 5
