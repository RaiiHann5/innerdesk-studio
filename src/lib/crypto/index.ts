/**
 * Vault cryptography. WebCrypto only: there is no crypto library and nothing hand-rolled here.
 *
 * THREAT MODEL (the same text appears in the app under "Cara kerja dan batasan")
 *
 * Protects against
 *  - someone reading localStorage or a database dump (everything stored is ciphertext or wrapped keys),
 *  - a leaked backup file (ciphertext plus meta, useless without the master password or recovery key),
 *  - a person with brief access to a screen that looks unlocked (auto-lock, masked fields; see the UI).
 *
 * Does NOT protect against
 *  - malware or a keylogger on the device,
 *  - XSS or any script running in the page while the vault is unlocked,
 *  - losing both the master password and the recovery key. There is no recovery by anyone, including us.
 *
 * This is not "unhackable" and must never be described that way.
 *
 * DESIGN
 *  master password --PBKDF2-HMAC-SHA-256, 600k iterations, random 16-byte salt--> KEK (non-extractable)
 *  recovery key (160 random bits, base32) --HKDF-SHA-256--> second KEK
 *  vault key VK (random 256-bit AES-GCM key) is stored only wrapped, once per KEK. A wrong password is
 *  detected because the AES-GCM unwrap fails; no password hash is stored.
 *  Each item is AES-256-GCM under VK with a fresh random 96-bit IV per write and AAD = id + schema version.
 *  Changing the password re-wraps VK. Rotating the key re-encrypts every item under a new VK.
 *
 * The session key is a non-extractable CryptoKey held in memory only. Nothing in this module reads or writes
 * localStorage, sessionStorage, IndexedDB or the console.
 */
export { VaultError, isVaultError, type VaultErrorCode } from './errors'
export type { EncryptedItem, KdfParams, VaultMeta, WrappedKey } from './types'
export { VaultSession } from './session'
export {
  DEFAULT_KDF_ITERATIONS,
  MIN_KDF_ITERATIONS,
  MIN_MASTER_PASSWORD_LENGTH,
  assertMasterPassword,
} from './keys'
export { RECOVERY_KEY_BYTES, formatRecoveryKey, parseRecoveryKey } from './recovery'
export { ITEM_SCHEMA_VERSION, newItemId, openItem, sealItem } from './items'
export { parseEncryptedItem, parseEncryptedItems, parseVaultMeta } from './schema'
export { changePassword, createVault, resetPasswordWithRecovery, unlockWithPassword, unlockWithRecovery } from './vault'
export { rotateVaultKey, settleInterruptedRotation, type VaultDeps } from './rotation'
export { BACKUP_FORMAT, exportBackup, parseBackup, restoreBackup } from './backup'
