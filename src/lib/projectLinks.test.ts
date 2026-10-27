import { describe, expect, it } from 'vitest'
import { checkLinkUrl, groupLinks, linkHost, safeHref } from './projectLinks'

const ok = (raw: string) => {
  const r = checkLinkUrl(raw)
  if (!r.ok) throw new Error(r.error)
  return r.url
}
const error = (raw: string) => {
  const r = checkLinkUrl(raw)
  return r.ok ? null : r.error
}

describe('checkLinkUrl', () => {
  it('accepts http and https, and gives a bare address https', () => {
    expect(ok('https://figma.com/file/abc')).toBe('https://figma.com/file/abc')
    expect(ok('http://example.com/a')).toBe('http://example.com/a')
    expect(ok('  figma.com/file/abc ')).toBe('https://figma.com/file/abc')
    expect(ok('localhost:3000/app')).toBe('https://localhost:3000/app')
  })

  it('rejects empty, spaced and malformed input', () => {
    expect(error('')).toMatch(/wajib/)
    expect(error('   ')).toMatch(/wajib/)
    expect(error('satu dua.com')).toMatch(/spasi/)
    expect(error('bukan alamat')).toBeTruthy()
    expect(error('https://')).toMatch(/tidak valid/)
    expect(error('https://tanpatitik')).toMatch(/tidak valid/)
  })

  it('rejects anything that is not a web address', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,hi', 'file:///etc/passwd', 'mailto:a@b.com', 'ftp://x.com/f']) {
      expect(error(bad), bad).toMatch(/http atau https|tidak valid/)
    }
  })

  it('rejects a username or password in the address', () => {
    expect(error('https://admin:rahasia@situs.com/login')).toMatch(/kata sandi/)
    expect(error('https://admin@situs.com')).toMatch(/kata sandi/)
    expect(error('user:pass@situs.com')).toBeTruthy()
  })

  it('rejects a secret in the query or fragment, whatever the case', () => {
    expect(error('https://situs.com/x?password=abc')).toMatch(/kata sandi atau token/)
    expect(error('https://situs.com/x?a=1&Token=abc')).toMatch(/token/)
    expect(error('https://situs.com/x?api_key=abc')).toBeTruthy()
    expect(error('https://situs.com/x#access_token=abc')).toBeTruthy()
    expect(ok('https://situs.com/x?tab=2&page=3')).toBe('https://situs.com/x?tab=2&page=3')
    expect(ok('https://docs.google.com/document/d/1AbC/edit#heading=h.x')).toContain('docs.google.com')
  })
})

describe('safeHref, linkHost, groupLinks', () => {
  it('only lets plain web addresses into an href', () => {
    expect(safeHref('https://a.com/x')).toBe('https://a.com/x')
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('https://u:p@a.com')).toBeNull()
    expect(safeHref('bukan url')).toBeNull()
  })

  it('shows the host without www', () => {
    expect(linkHost('https://www.figma.com/file/x')).toBe('figma.com')
    expect(linkHost('rusak')).toBe('rusak')
  })

  it('groups by kind in a fixed order and leaves empty kinds out', () => {
    const links = [
      { id: '1', title: 'A', url: 'https://a.com', kind: 'desain' as const },
      { id: '2', title: 'B', url: 'https://b.com', kind: 'akun' as const },
      { id: '3', title: 'C', url: 'https://c.com', kind: 'desain' as const },
    ]
    expect(groupLinks(links).map((g) => [g.kind, g.links.map((l) => l.id)])).toEqual([
      ['akun', ['2']],
      ['desain', ['1', '3']],
    ])
    expect(groupLinks([])).toEqual([])
  })
})
