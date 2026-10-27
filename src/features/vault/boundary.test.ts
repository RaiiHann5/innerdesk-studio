import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = path.resolve(import.meta.dirname, '../..')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/** Comments may talk about localStorage or the console; only code counts. */
/** Test helpers (testing.ts, testSetup.ts) may clear storage; only code that ships in the app counts. */
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const sources = walk(SRC)
  .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file) && !/(testing|testSetup)\.ts$/.test(file))
  .map((file) => ({ file: path.relative(SRC, file).replaceAll('\\', '/'), text: stripComments(readFileSync(file, 'utf8')) }))

const mentions = (pattern: RegExp, where: (file: string) => boolean) =>
  sources.filter(({ file, text }) => where(file) && pattern.test(text)).map(({ file }) => file)

describe('vault boundaries', () => {
  it('the data layer never imports the plaintext vault types', () => {
    expect(mentions(/features\/vault/, (f) => f.startsWith('data/'))).toEqual([])
  })

  it('the data layer and the crypto module never see plaintext item kinds', () => {
    expect(mentions(/\b(LoginPayload|ApiKeyPayload|SecureNotePayload|WifiPayload|VaultItemPayload|passwordHistory)\b/, (f) => f.startsWith('data/') || f.startsWith('lib/crypto/'))).toEqual([])
  })

  it('startup loading does not touch the vault', () => {
    expect(mentions(/vault/i, (f) => f === 'stores/entities.ts' || f === 'stores/createEntityStore.ts')).toEqual([])
  })

  it('nothing global reads the vault repos or the vault feature', () => {
    // The only places outside the feature that may know it exists: its route, the runtime that enforces locking,
    // and the lock button in the top bar. Anything else (search, palette, dashboard, calendar...) must not.
    const allowed = (file: string) =>
      file.startsWith('features/vault/') ||
      file.startsWith('data/repos/') ||
      file.startsWith('lib/crypto/') ||
      ['app/router.tsx', 'app/AppShell.tsx', 'components/layout/TopBar.tsx'].includes(file)
    expect(mentions(/vaultItemRepo|vaultMetaRepo|features\/vault|lib\/crypto/, (f) => !allowed(f))).toEqual([])
  })

  it('the crypto module never touches browser storage, the console or the network', () => {
    expect(mentions(/localStorage|sessionStorage|indexedDB|console\.|fetch\(|XMLHttpRequest|document\.cookie/, (f) => f.startsWith('lib/crypto/'))).toEqual([])
  })

  it('uses no crypto library and no Math.random for key material', () => {
    expect(mentions(/from ['"](crypto-js|node:crypto|crypto|bcryptjs?|argon2|tweetnacl|libsodium[^'"]*|@noble\/[^'"]+|sjcl|forge)['"]/, () => true)).toEqual([])
    expect(mentions(/Math\.random/, (f) => f.startsWith('lib/crypto/'))).toEqual([])
  })

  it('the vault feature makes no network request, logs nothing, and loads no icons or images', () => {
    expect(mentions(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|console\.|favicon|<img|new Image\(|https?:\/\/[a-z0-9.-]+\.[a-z]{2,}\/[^'"`\s]*\.(png|ico|svg|jpg)/i, (f) => f.startsWith('features/vault/'))).toEqual([])
  })

  it('the generator never uses Math.random', () => {
    expect(mentions(/Math\.random/, (f) => f.startsWith('features/vault/') || f.startsWith('lib/crypto/'))).toEqual([])
  })

  it('nothing outside the vault sweeps localStorage, so a global export or reset cannot take the vault with it', () => {
    // A feature that walks every key would silently include (or wipe) pos:v1:vault-*. If one is ever needed, it must skip them on purpose.
    const outside = (file: string) => !file.startsWith('features/vault/') && !file.startsWith('data/repos/local/createLocalVaultRepos') && !file.startsWith('lib/crypto/')
    expect(mentions(/localStorage\.clear|Object\.(keys|entries|values)\(\s*localStorage|localStorage\.key\(|localStorage\.length/, outside)).toEqual([])
  })
})
