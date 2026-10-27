import { describe, expect, it } from 'vitest'
import { searchUrl, withScheme } from './links'

describe('withScheme', () => {
  it('adds https:// to a bare address', () => expect(withScheme('contoh.id/a')).toBe('https://contoh.id/a'))
  it('keeps addresses that already have a scheme, a path or an anchor', () => {
    for (const a of ['http://x.id', 'mailto:a@b.id', '/catatan', '#bagian']) expect(withScheme(a)).toBe(a)
  })
})

describe('searchUrl', () => {
  it('encodes the text and collapses whitespace', () => {
    expect(searchUrl('  rapat \n mingguan ')).toBe('https://www.google.com/search?q=rapat%20mingguan')
  })
  it('cuts very long selections', () => {
    const q = new URL(searchUrl('a'.repeat(500))).searchParams.get('q')
    expect(q).toHaveLength(200)
  })
})
