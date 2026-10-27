import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { fromBase64, toBase64 } from './bytes'
import {
  VaultError,
  changePassword,
  createVault,
  newItemId,
  openItem,
  parseVaultMeta,
  resetPasswordWithRecovery,
  sealItem,
  unlockWithPassword,
  unlockWithRecovery,
  type VaultMeta,
  type VaultSession,
} from './index'
import { formatRecoveryKey, parseRecoveryKey } from './recovery'
import { flipByte, installForbiddenStorage } from './testing'

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 })

const PASSWORD = 'correct horse battery staple'
const OTHER_PASSWORD = 'a completely different passphrase'
const SECRET = { kind: 'login', title: 'Bank', password: 'p@ss-Ünïcode-✓-hunter2', notes: 'x'.repeat(3000) }

const code = (promise: Promise<unknown>) =>
  promise.then(
    () => 'resolved',
    (error: unknown) => (error instanceof VaultError ? error.code : `other:${String(error)}`),
  )

let meta: VaultMeta
let session: VaultSession
let recoveryKey: string
const consoleSpies = ['log', 'info', 'warn', 'error', 'debug'].map((name) => vi.spyOn(console, name as 'log').mockImplementation(() => {}))

beforeAll(async () => {
  installForbiddenStorage()
  const created = await createVault(PASSWORD)
  meta = created.meta
  session = created.session
  recoveryKey = created.recoveryKey
})

afterAll(() => {
  // Neither the crypto module nor anything it calls logged: no payload, key or error text reaches the console.
  for (const spy of consoleSpies) expect(spy).not.toHaveBeenCalled()
  vi.unstubAllGlobals()
})

describe('createVault', () => {
  it('stores the KDF cost and a fresh salt in the meta, and nothing secret', () => {
    expect(meta.kdf).toMatchObject({ name: 'PBKDF2-SHA256', iterations: 600_000 })
    expect(fromBase64(meta.kdf.salt)).toHaveLength(16)
    expect(parseVaultMeta(structuredClone(meta))).toEqual(meta)
    const text = JSON.stringify(meta)
    expect(text).not.toContain(PASSWORD)
    expect(text).not.toContain(recoveryKey)
    expect(Object.keys(meta).sort()).toEqual(
      ['createdAt', 'keyEpoch', 'kdf', 'revision', 'updatedAt', 'version', 'wrappedVkByPassword', 'wrappedVkByRecovery'].sort(),
    )
  })

  it('shows a recovery key of 160 bits as 8 groups of 4 base32 characters', () => {
    expect(recoveryKey).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){7}[0-9A-HJKMNP-TV-Z]{4}$/)
    expect(parseRecoveryKey(recoveryKey)).toHaveLength(20)
    expect(formatRecoveryKey(parseRecoveryKey(recoveryKey))).toBe(recoveryKey)
  })

  it('refuses a master password under 12 characters, and counts characters not bytes', async () => {
    expect(await code(createVault('short pass'))).toBe('invalid-input')
    expect(await code(createVault('12345678901'))).toBe('invalid-input')
    expect(await code(createVault('✓✓✓✓✓✓✓✓✓✓✓'))).toBe('invalid-input')
  })

  it('does not keep the session key where anyone can read it', () => {
    expect(JSON.stringify(session)).toBe('{"keyEpoch":1}')
    expect(Object.getOwnPropertyNames(session)).toEqual(['keyEpoch'])
  })
})

describe('items', () => {
  it('round-trips a payload, including unicode', async () => {
    const id = newItemId()
    const sealed = await sealItem(session, { id, payload: SECRET })
    expect(await openItem(session, sealed)).toEqual(SECRET)
    expect(JSON.stringify(sealed)).not.toContain('hunter2')
    expect(Object.keys(sealed).sort()).toEqual(['ciphertext', 'createdAt', 'id', 'iv', 'updatedAt', 'v'])
  })

  it('pads, so a short and a longer password give the same stored size', async () => {
    const a = await sealItem(session, { id: 'a', payload: { password: 'x'.repeat(8) } })
    const b = await sealItem(session, { id: 'b', payload: { password: 'x'.repeat(40) } })
    expect(fromBase64(a.ciphertext)).toHaveLength(fromBase64(b.ciphertext).length)
    expect((fromBase64(a.ciphertext).length - 16) % 256).toBe(0)
  })

  it('keeps createdAt on edit and uses a different IV every time for the same item', async () => {
    const first = await sealItem(session, { id: 'same', payload: { n: 1 }, createdAt: '2026-01-01T00:00:00.000Z' })
    const second = await sealItem(session, { id: 'same', payload: { n: 1 }, createdAt: first.createdAt })
    expect(second.createdAt).toBe('2026-01-01T00:00:00.000Z')
    expect(second.iv).not.toBe(first.iv)
    expect(second.ciphertext).not.toBe(first.ciphertext)
  })

  it('never repeats an IV across thousands of encryptions', async () => {
    const ivs = new Set<string>()
    const total = 5000
    for (let i = 0; i < total; i++) ivs.add((await sealItem(session, { id: 'iv-test', payload: { i } })).iv)
    expect(ivs.size).toBe(total)
  })

  it('rejects an id that could blur the AAD, and a payload that is not JSON', async () => {
    expect(await code(sealItem(session, { id: 'a|b', payload: {} }))).toBe('invalid-input')
    expect(await code(sealItem(session, { id: '', payload: {} }))).toBe('invalid-input')
    expect(await code(sealItem(session, { id: 'ok', payload: undefined }))).toBe('invalid-input')
  })

  it('fails when a ciphertext byte is flipped, wherever it is', async () => {
    const sealed = await sealItem(session, { id: 'flip', payload: SECRET })
    const length = fromBase64(sealed.ciphertext).length
    for (const position of [0, 1, Math.floor(length / 2), length - 17, length - 16, -1]) {
      expect(await code(openItem(session, { ...sealed, ciphertext: flipByte(sealed.ciphertext, position) }))).toBe('corrupt')
    }
    expect(await code(openItem(session, { ...sealed, iv: flipByte(sealed.iv, 0) }))).toBe('corrupt')
    expect(await openItem(session, sealed)).toEqual(SECRET)
  })

  it('fails when the ciphertext is truncated or extended', async () => {
    const sealed = await sealItem(session, { id: 'trunc', payload: SECRET })
    const bytes = fromBase64(sealed.ciphertext)
    expect(await code(openItem(session, { ...sealed, ciphertext: toBase64(bytes.subarray(0, bytes.length - 1)) }))).toBe('corrupt')
    expect(await code(openItem(session, { ...sealed, ciphertext: toBase64(new Uint8Array([...bytes, 0])) }))).toBe('corrupt')
  })

  it('fails when the AAD does not match: a ciphertext cannot be moved to another record', async () => {
    const a = await sealItem(session, { id: 'record-a', payload: { who: 'a' } })
    const b = await sealItem(session, { id: 'record-b', payload: { who: 'b' } })
    expect(await code(openItem(session, { ...a, id: 'record-b' }))).toBe('corrupt')
    expect(await code(openItem(session, { ...b, id: 'record-a' }))).toBe('corrupt')
    // Swapping the payloads of two records, keeping each id:
    expect(await code(openItem(session, { ...a, iv: b.iv, ciphertext: b.ciphertext }))).toBe('corrupt')
    // The schema version is part of the AAD and an unknown one is refused outright:
    expect(await code(openItem(session, { ...a, v: 2 }))).toBe('unsupported')
  })

  it('cannot be opened by a different vault, or after the session is destroyed', async () => {
    const other = await createVault(OTHER_PASSWORD)
    const sealed = await sealItem(session, { id: 'x', payload: { a: 1 } })
    expect(await code(openItem(other.session, sealed))).toBe('corrupt')
    other.session.destroy()
    expect(other.session.active).toBe(false)
    expect(await code(sealItem(other.session, { id: 'y', payload: {} }))).toBe('locked')
    expect(await code(openItem(other.session, sealed))).toBe('locked')
  })
})

describe('unlocking', () => {
  it('opens items sealed by the creating session, with the master password', async () => {
    const sealed = await sealItem(session, { id: 'persist', payload: SECRET })
    const again = await unlockWithPassword(meta, PASSWORD)
    expect(await openItem(again, sealed)).toEqual(SECRET)
    expect(again.keyEpoch).toBe(meta.keyEpoch)
  })

  it('fails with a wrong password, an empty password, and a near miss', async () => {
    expect(await code(unlockWithPassword(meta, OTHER_PASSWORD))).toBe('bad-credentials')
    expect(await code(unlockWithPassword(meta, ''))).toBe('bad-credentials')
    expect(await code(unlockWithPassword(meta, PASSWORD + ' '))).toBe('bad-credentials')
  })

  it('treats the same passphrase in a different Unicode form as the same password', async () => {
    const composed = 'passphrase-é-✓-long-enough'
    const decomposed = composed.normalize('NFD')
    expect(composed).not.toBe(decomposed)
    const created = await createVault(composed)
    const unlocked = await unlockWithPassword(created.meta, decomposed)
    expect(unlocked.active).toBe(true)
  })

  it('unlocks with the recovery key, however it is typed', async () => {
    const sealed = await sealItem(session, { id: 'rec', payload: SECRET })
    for (const typed of [recoveryKey, recoveryKey.toLowerCase(), recoveryKey.replaceAll('-', ''), `  ${recoveryKey.replaceAll('-', ' ')}  `]) {
      expect(await openItem(await unlockWithRecovery(meta, typed), sealed)).toEqual(SECRET)
    }
  })

  it('rejects a wrong recovery key and a malformed one differently', async () => {
    const wrong = formatRecoveryKey(new Uint8Array(20).fill(7))
    expect(await code(unlockWithRecovery(meta, wrong))).toBe('bad-credentials')
    expect(await code(unlockWithRecovery(meta, 'NOT-A-KEY'))).toBe('invalid-input')
    expect(await code(unlockWithRecovery(meta, recoveryKey.slice(0, -1)))).toBe('invalid-input')
    expect(await code(unlockWithRecovery(meta, recoveryKey.replace(/.$/, '!')))).toBe('invalid-input')
  })

  it('does not accept the recovery key as the master password or the reverse', async () => {
    expect(await code(unlockWithPassword(meta, recoveryKey))).toBe('bad-credentials')
  })
})

describe('tampered meta', () => {
  it('fails when a wrapped key byte is flipped', async () => {
    const bad = structuredClone(meta)
    bad.wrappedVkByPassword.ciphertext = flipByte(bad.wrappedVkByPassword.ciphertext, 5)
    expect(await code(unlockWithPassword(bad, PASSWORD))).toBe('bad-credentials')
    const badRecovery = structuredClone(meta)
    badRecovery.wrappedVkByRecovery.ciphertext = flipByte(badRecovery.wrappedVkByRecovery.ciphertext, 5)
    expect(await code(unlockWithRecovery(badRecovery, recoveryKey))).toBe('bad-credentials')
  })

  it('refuses a lowered iteration count instead of unlocking with weaker stretching', async () => {
    const weak = structuredClone(meta)
    weak.kdf.iterations = 1000
    expect(await code(unlockWithPassword(weak, PASSWORD))).toBe('corrupt')
  })

  it('fails when the salt is swapped, and refuses unknown fields and versions', async () => {
    const swapped = structuredClone(meta)
    swapped.kdf.salt = flipByte(swapped.kdf.salt, 0)
    expect(await code(unlockWithPassword(swapped, PASSWORD))).toBe('bad-credentials')
    expect(() => parseVaultMeta({ ...meta, extra: 1 })).toThrow(VaultError)
    expect(() => parseVaultMeta({ ...meta, version: 2 })).toThrow(VaultError)
    expect(await code(unlockWithPassword({ ...meta, version: 2 } as unknown as VaultMeta, PASSWORD))).toBe('unsupported')
  })
})

describe('changing the master password', () => {
  it('keeps every item readable, keeps the recovery key valid, and retires the old password', async () => {
    const sealed = await sealItem(session, { id: 'keep', payload: SECRET })
    const next = await changePassword(meta, PASSWORD, OTHER_PASSWORD)

    expect(next.revision).toBe(meta.revision + 1)
    expect(next.keyEpoch).toBe(meta.keyEpoch)
    expect(next.kdf.salt).not.toBe(meta.kdf.salt)
    expect(next.kdf.iterations).toBeGreaterThanOrEqual(meta.kdf.iterations)
    expect(next.wrappedVkByRecovery).toEqual(meta.wrappedVkByRecovery)
    expect(next.wrappedVkByPassword).not.toEqual(meta.wrappedVkByPassword)

    expect(await openItem(await unlockWithPassword(next, OTHER_PASSWORD), sealed)).toEqual(SECRET)
    expect(await code(unlockWithPassword(next, PASSWORD))).toBe('bad-credentials')
    expect(await openItem(await unlockWithRecovery(next, recoveryKey), sealed)).toEqual(SECRET)
  })

  it('needs the current password, and a new one that meets the length rule', async () => {
    expect(await code(changePassword(meta, OTHER_PASSWORD, 'another long passphrase'))).toBe('bad-credentials')
    expect(await code(changePassword(meta, PASSWORD, 'too short'))).toBe('invalid-input')
  })

  it('sets a new password from the recovery key without changing the vault key', async () => {
    const sealed = await sealItem(session, { id: 'reset', payload: SECRET })
    const reset = await resetPasswordWithRecovery(meta, recoveryKey, 'a brand new passphrase!')
    expect(await openItem(reset.session, sealed)).toEqual(SECRET)
    expect(await openItem(await unlockWithPassword(reset.meta, 'a brand new passphrase!'), sealed)).toEqual(SECRET)
    expect(await code(unlockWithPassword(reset.meta, PASSWORD))).toBe('bad-credentials')
    expect(await code(resetPasswordWithRecovery(meta, formatRecoveryKey(new Uint8Array(20)), 'a brand new passphrase!'))).toBe('bad-credentials')
  })
})
