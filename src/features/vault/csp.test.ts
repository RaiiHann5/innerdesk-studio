import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../../..')
const read = (file: string) => readFileSync(path.join(ROOT, file), 'utf8')

const html = read('index.html')
const doc = read('docs/vault-security.md')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

/** The production policy, from the first code block under its heading in the doc. */
function documentedPolicy(): Map<string, string[]> {
  const section = doc.slice(doc.indexOf('## Content-Security-Policy produksi'))
  const block = /```\n([\s\S]*?)```/.exec(section)![1]
  const body = block.replace(/^Content-Security-Policy:/, '')
  return new Map(
    body
      .split(';')
      .map((part) => part.trim().split(/\s+/).filter(Boolean))
      .filter((parts) => parts.length > 0)
      .map(([name, ...values]) => [name, values] as [string, string[]]),
  )
}

describe('index.html', () => {
  it('has no inline script and loads scripts only from this origin', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1])
    expect(scripts.length).toBeGreaterThan(0)
    for (const attributes of scripts) {
      const src = /\bsrc="([^"]*)"/.exec(attributes)?.[1]
      expect(src, `inline script: <script${attributes}>`).toBeDefined()
      expect(src!.startsWith('/'), src).toBe(true)
      expect(src!.startsWith('//'), src).toBe(false)
    }
  })

  it('carries the directives that cannot break the app, and nothing that weakens a policy', () => {
    const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? ''
    for (const directive of ["object-src 'none'", "base-uri 'self'", "form-action 'self'"]) expect(meta).toContain(directive)
    expect(meta).not.toMatch(/unsafe-/)
  })

  it('keeps the theme script as a plain file that touches no network', () => {
    expect(existsSync(path.join(ROOT, 'public/theme-init.js'))).toBe(true)
    expect(read('public/theme-init.js')).not.toMatch(/fetch\(|XMLHttpRequest|import\(|importScripts|eval\(|new Function/)
  })
})

describe('documented production policy', () => {
  const policy = documentedPolicy()

  it('is strict about scripts and closes the doors the app does not use', () => {
    expect(policy.get('default-src')).toEqual(["'none'"])
    expect(policy.get('script-src')).toEqual(["'self'"])
    expect(policy.get('object-src')).toEqual(["'none'"])
    expect(policy.get('base-uri')).toEqual(["'self'"])
    expect(policy.get('frame-ancestors')).toEqual(["'none'"])
    expect([...policy.values()].flat().filter((value) => value.includes('unsafe-eval'))).toEqual([])
    expect([...policy.values()].flat().filter((value) => value === '*' || value.startsWith('*.'))).toEqual([])
  })

  it('lists, in connect-src, every origin the code fetches from, and nothing broader', () => {
    const files = walk(path.join(ROOT, 'src')).filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\./.test(file))
    const origins = new Set<string>()
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      if (!/\bfetch\(/.test(text)) continue
      for (const match of text.matchAll(/https?:\/\/[a-z0-9.-]+/gi)) origins.add(match[0])
    }
    // The Supabase client fetches from VITE_SUPABASE_URL, which is configuration, not a literal in code. .env.example holds the origin the doc must list.
    const supabaseOrigin = /^VITE_SUPABASE_URL=(https?:\/\/[a-z0-9.-]+)/im.exec(read('.env.example'))?.[1]
    expect(supabaseOrigin).toBeDefined()
    origins.add(supabaseOrigin!)
    expect([...origins].length).toBeGreaterThan(0)
    const connect = policy.get('connect-src') ?? []
    for (const origin of origins) expect(connect, origin).toContain(origin)
    expect(connect.filter((value) => value.startsWith('http') && !origins.has(value))).toEqual([])
  })

  it('allows the third-party hosts index.html links to, in style-src and font-src only', () => {
    const hosts = [...html.matchAll(/(?:href|src)="(https:\/\/[^/"]+)/g)].map((match) => match[1])
    expect(hosts.length).toBeGreaterThan(0)
    const allowed = [...(policy.get('style-src') ?? []), ...(policy.get('font-src') ?? [])]
    for (const host of new Set(hosts)) expect(allowed, host).toContain(host)
    expect(policy.get('script-src')!.some((v) => v.startsWith('http'))).toBe(false)
  })

  it('states the no-third-party-scripts rule', () => {
    expect(doc).toContain('Tidak ada skrip pihak ketiga yang boleh ditambahkan ke aplikasi ini')
  })
})
