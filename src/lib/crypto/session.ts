import { VaultError } from './errors'

const keys = new WeakMap<VaultSession, CryptoKey>()

/**
 * An unlocked vault. The key is a non-extractable CryptoKey kept in a module-private WeakMap, so it is
 * not a property anyone can read, serialise or log. `destroy()` drops the only reference.
 *
 * A CryptoKey cannot be zeroed from JavaScript. Dropping the reference is the best that can be done,
 * and the browser decides when the memory is actually reclaimed.
 */
export class VaultSession {
  /** The vault key generation this session was unlocked against. Item writes are checked against it. */
  readonly keyEpoch: number

  constructor(key: CryptoKey, keyEpoch: number) {
    this.keyEpoch = keyEpoch
    keys.set(this, key)
  }

  get active(): boolean {
    return keys.has(this)
  }

  destroy(): void {
    keys.delete(this)
  }
}

/** Internal to lib/crypto. Not re-exported from the barrel. */
export function sessionKey(session: VaultSession): CryptoKey {
  const key = keys.get(session)
  if (!key) throw new VaultError('locked')
  return key
}

/** Same key, new epoch label. Used when a restore bumps the epoch. The old session is destroyed. */
export function rebindSession(session: VaultSession, keyEpoch: number): VaultSession {
  const next = new VaultSession(sessionKey(session), keyEpoch)
  session.destroy()
  return next
}
