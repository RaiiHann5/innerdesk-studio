import { describe, expect, it } from 'vitest'
import type { VaultItem, VaultItemPayload } from '../types'
import {
  cleanTags,
  cleanUrls,
  daysUntil,
  emptyPayload,
  filterAndSort,
  itemTitle,
  monogram,
  nextHistory,
  parsePayload,
  safeHttpUrl,
  validateDraft,
} from './payload'

const make = (payload: VaultItemPayload, id: string): VaultItem => ({ ...payload, id, createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-10-01T00:00:00.000Z' }) as VaultItem

describe('parsePayload', () => {
  it('round-trips every kind and fills in missing optional fields', () => {
    for (const kind of ['login', 'apiKey', 'secureNote', 'wifi'] as const) {
      const empty = emptyPayload(kind)
      expect(parsePayload(JSON.parse(JSON.stringify(empty)))).toEqual(empty)
    }
    expect(parsePayload({ kind: 'login', title: 'Bank' })).toMatchObject({ kind: 'login', username: '', urls: [], tags: [], passwordHistory: [], favorite: false })
    expect(parsePayload({ kind: 'apiKey', title: 'k', expiresAt: '2027-01-01' })).toMatchObject({ expiresAt: '2027-01-01' })
  })

  it('rejects anything it does not understand instead of guessing', () => {
    for (const bad of [null, 'x', [], 5, {}, { kind: 'card' }, { kind: 'login', title: 5 }, { kind: 'login', urls: 'a' }, { kind: 'login', tags: [1] }, { kind: 'login', favorite: 'yes' }, { kind: 'login', passwordHistory: [{ password: 1 }] }, { kind: 'wifi', ssid: 'x', security: 'WPA9' }, { kind: 'apiKey', expiresAt: 5 }]) {
      expect(parsePayload(bad), JSON.stringify(bad)).toBeNull()
    }
  })

  it('keeps at most 5 history entries', () => {
    const entries = Array.from({ length: 9 }, (_, i) => ({ password: `p${i}`, replacedAt: '2026-01-01T00:00:00.000Z' }))
    expect((parsePayload({ kind: 'login', title: 't', passwordHistory: entries }) as { passwordHistory: unknown[] }).passwordHistory).toHaveLength(5)
  })
})

describe('titles, monograms and links', () => {
  it('uses the network name for Wi-Fi, a fallback for an empty title, and one letter per item', () => {
    expect(itemTitle({ ...emptyPayload('wifi'), ssid: 'Rumah' } as VaultItemPayload)).toBe('Rumah')
    expect(itemTitle(emptyPayload('login'))).toBe('Tanpa judul')
    expect(monogram({ ...emptyPayload('login'), title: 'éclair' } as VaultItemPayload)).toBe('É')
    expect(monogram({ ...emptyPayload('login'), title: '🔑 kunci' } as VaultItemPayload)).toBe('🔑')
  })

  it('only makes http and https links clickable', () => {
    expect(safeHttpUrl('example.com/login')).toBe('https://example.com/login')
    expect(safeHttpUrl('http://example.com')).toBe('http://example.com/')
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://x.com', '']) expect(safeHttpUrl(bad), bad).toBeNull()
  })
})

describe('validateDraft and cleaners', () => {
  it('needs a title (or network name) and enforces limits', () => {
    expect(validateDraft(emptyPayload('login'))).toMatch(/Judul/)
    expect(validateDraft(emptyPayload('wifi'))).toMatch(/Nama jaringan/)
    expect(validateDraft({ ...emptyPayload('login'), title: 'x' } as VaultItemPayload)).toBeNull()
    expect(validateDraft({ ...emptyPayload('login'), title: 'x'.repeat(121) } as VaultItemPayload)).toMatch(/120/)
    expect(validateDraft({ ...emptyPayload('login'), title: 'x', password: 'p'.repeat(1025) } as VaultItemPayload)).toMatch(/1024/)
    expect(validateDraft({ ...emptyPayload('apiKey'), title: 'x', expiresAt: 'besok' } as VaultItemPayload)).toMatch(/kedaluwarsa/)
  })

  it('cleans tags and urls', () => {
    expect(cleanTags(' Kerja, kerja ,Bank\n,, ')).toEqual(['Kerja', 'Bank'])
    expect(cleanTags(Array.from({ length: 30 }, (_, i) => `t${i}`).join(','))).toHaveLength(12)
    expect(cleanUrls(' a.com \n\n b.com ')).toEqual(['a.com', 'b.com'])
  })

  it('counts days to expiry', () => {
    expect(daysUntil('2026-10-20', '2026-10-11')).toBe(9)
    expect(daysUntil('2026-10-11', '2026-10-11')).toBe(0)
    expect(daysUntil('2026-10-01', '2026-10-11')).toBe(-10)
  })
})

describe('filterAndSort', () => {
  const items = [
    make({ ...emptyPayload('login'), title: 'Bank', username: 'budi', password: 'hunter2-secret', urls: ['bank.co.id'], tags: ['uang'] } as VaultItemPayload, 'a'),
    make({ ...emptyPayload('apiKey'), title: 'Stripe', service: 'payments', key: 'sk_live_abc', favorite: true } as VaultItemPayload, 'b'),
    make({ ...emptyPayload('secureNote'), title: 'Resep', body: 'rahasia dapur', favorite: false } as VaultItemPayload, 'c'),
    make({ ...emptyPayload('wifi'), ssid: 'Rumah', password: 'wifi-secret-1' } as VaultItemPayload, 'd'),
  ]

  it('puts favourites first, then sorts by title', () => {
    expect(filterAndSort(items, { query: '', kind: 'all' }).map((i) => i.id)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('filters by kind chip', () => {
    expect(filterAndSort(items, { query: '', kind: 'wifi' }).map((i) => i.id)).toEqual(['d'])
  })

  it('searches titles, usernames, urls, services, tags, note bodies and network names, case-insensitively and with several terms', () => {
    for (const [query, id] of [['STRIPE', 'b'], ['budi', 'a'], ['bank.co', 'a'], ['payments', 'b'], ['uang', 'a'], ['dapur', 'c'], ['rumah', 'd'], ['bank budi', 'a']] as const) {
      expect(filterAndSort(items, { query, kind: 'all' }).map((i) => i.id), query).toEqual([id])
    }
    expect(filterAndSort(items, { query: 'tidak ada', kind: 'all' })).toEqual([])
  })

  it('never matches on a secret value', () => {
    for (const secret of ['hunter2', 'sk_live', 'wifi-secret']) expect(filterAndSort(items, { query: secret, kind: 'all' }), secret).toEqual([])
  })
})

describe('nextHistory', () => {
  const login = (password: string, history: Array<{ password: string; replacedAt: string }> = []) => ({ ...emptyPayload('login'), title: 't', password, passwordHistory: history }) as Extract<VaultItemPayload, { kind: 'login' }>

  it('keeps the old password when it changes, newest first, capped at 5', () => {
    let current = login('p0')
    for (let i = 1; i <= 8; i++) {
      const history = nextHistory(current, `p${i}`, `2026-10-0${Math.min(i, 9)}T00:00:00.000Z`)
      current = login(`p${i}`, history)
    }
    expect(current.passwordHistory.map((e) => e.password)).toEqual(['p7', 'p6', 'p5', 'p4', 'p3'])
  })

  it('leaves the history alone when the password did not change, and for a new item', () => {
    const history = [{ password: 'old', replacedAt: '2026-01-01T00:00:00.000Z' }]
    expect(nextHistory(login('same', history), 'same', 'now')).toEqual(history)
    expect(nextHistory(null, 'anything', 'now')).toEqual([])
    expect(nextHistory(login('', history), 'new', 'now')).toEqual(history)
  })
})
