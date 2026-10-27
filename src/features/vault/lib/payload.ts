import {
  PASSWORD_HISTORY_LIMIT,
  type ApiKeyPayload,
  type LoginPayload,
  type PasswordHistoryEntry,
  type SecureNotePayload,
  type VaultItem,
  type VaultItemKind,
  type VaultItemPayload,
  type WifiPayload,
  type WifiSecurity,
} from '../types'

/** What a decrypted payload may hold. Generous, but bounded so one bad item cannot freeze the page. */
export const LIMITS = { title: 120, short: 300, secret: 1024, notes: 10_000, body: 50_000, urls: 10, url: 500, tags: 12, tag: 32 } as const

export const KIND_LABELS: Record<VaultItemKind, string> = { login: 'Login', apiKey: 'Kunci API', secureNote: 'Catatan aman', wifi: 'Wi-Fi' }
export const KIND_ORDER: VaultItemKind[] = ['login', 'apiKey', 'secureNote', 'wifi']
export const WIFI_SECURITY: Array<{ value: WifiSecurity; label: string }> = [
  { value: 'WPA3', label: 'WPA3' },
  { value: 'WPA2', label: 'WPA2' },
  { value: 'WPA', label: 'WPA' },
  { value: 'WEP', label: 'WEP' },
  { value: 'open', label: 'Terbuka (tanpa sandi)' },
]

export function emptyPayload(kind: VaultItemKind): VaultItemPayload {
  switch (kind) {
    case 'login':
      return { kind, title: '', username: '', password: '', urls: [], notes: '', tags: [], passwordHistory: [], favorite: false }
    case 'apiKey':
      return { kind, title: '', service: '', key: '', notes: '', tags: [], favorite: false }
    case 'secureNote':
      return { kind, title: '', body: '', tags: [], favorite: false }
    case 'wifi':
      return { kind, ssid: '', password: '', security: 'WPA2', notes: '' }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

/** A missing field becomes its default; a field of the wrong type fails the whole item (returns null). */
function text(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (value === undefined) return ''
  return typeof value === 'string' ? value : null
}

function list(record: Record<string, unknown>, key: string): string[] | null {
  const value = record[key]
  if (value === undefined) return []
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? (value as string[]) : null
}

function flag(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key]
  if (value === undefined) return false
  return typeof value === 'boolean' ? value : null
}

function history(record: Record<string, unknown>): PasswordHistoryEntry[] | null {
  const value = record.passwordHistory
  if (value === undefined) return []
  if (!Array.isArray(value)) return null
  const entries: PasswordHistoryEntry[] = []
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.password !== 'string' || typeof entry.replacedAt !== 'string') return null
    entries.push({ password: entry.password, replacedAt: entry.replacedAt })
  }
  return entries.slice(0, PASSWORD_HISTORY_LIMIT)
}

/** Turns decrypted JSON into a typed payload, or null when it is not one this version understands. */
export function parsePayload(raw: unknown): VaultItemPayload | null {
  if (!isRecord(raw)) return null
  const fields = (keys: string[]) => keys.map((key) => text(raw, key))
  const arrays = (keys: string[]) => keys.map((key) => list(raw, key))
  switch (raw.kind) {
    case 'login': {
      const [title, username, password, notes] = fields(['title', 'username', 'password', 'notes'])
      const [urls, tags] = arrays(['urls', 'tags'])
      const favorite = flag(raw, 'favorite')
      const passwordHistory = history(raw)
      if ([title, username, password, notes, urls, tags, favorite, passwordHistory].includes(null)) return null
      return { kind: 'login', title, username, password, notes, urls, tags, favorite, passwordHistory } as LoginPayload
    }
    case 'apiKey': {
      const [title, service, key, notes] = fields(['title', 'service', 'key', 'notes'])
      const [tags] = arrays(['tags'])
      const favorite = flag(raw, 'favorite')
      const expiresAt = raw.expiresAt
      if ([title, service, key, notes, tags, favorite].includes(null) || (expiresAt !== undefined && typeof expiresAt !== 'string')) return null
      return { kind: 'apiKey', title, service, key, notes, tags, favorite, ...(expiresAt ? { expiresAt } : {}) } as ApiKeyPayload
    }
    case 'secureNote': {
      const [title, body] = fields(['title', 'body'])
      const [tags] = arrays(['tags'])
      const favorite = flag(raw, 'favorite')
      if ([title, body, tags, favorite].includes(null)) return null
      return { kind: 'secureNote', title, body, tags, favorite } as SecureNotePayload
    }
    case 'wifi': {
      const [ssid, password, notes] = fields(['ssid', 'password', 'notes'])
      const security = WIFI_SECURITY.find((option) => option.value === raw.security)?.value ?? (raw.security === undefined ? 'WPA2' : null)
      if ([ssid, password, notes, security].includes(null)) return null
      return { kind: 'wifi', ssid, password, notes, security } as WifiPayload
    }
    default:
      return null
  }
}

export const itemTitle = (item: VaultItemPayload): string => (item.kind === 'wifi' ? item.ssid : item.title).trim() || 'Tanpa judul'

/** One uppercase letter (or emoji) stands in for a site icon. No favicon or icon service is ever contacted. */
export function monogram(item: VaultItemPayload): string {
  const first = [...itemTitle(item)][0] ?? '?'
  return first.toLocaleUpperCase('id-ID')
}

/** Returns an error message in Indonesian, or null when the draft can be saved. */
export function validateDraft(draft: VaultItemPayload): string | null {
  const name = draft.kind === 'wifi' ? draft.ssid : draft.title
  if (name.trim().length === 0) return draft.kind === 'wifi' ? 'Nama jaringan wajib diisi.' : 'Judul wajib diisi.'
  if (name.length > LIMITS.title) return `Maksimal ${LIMITS.title} karakter untuk judul.`
  if ('notes' in draft && draft.notes.length > LIMITS.notes) return `Catatan terlalu panjang (maksimal ${LIMITS.notes} karakter).`
  if (draft.kind === 'secureNote' && draft.body.length > LIMITS.body) return `Isi catatan terlalu panjang (maksimal ${LIMITS.body} karakter).`
  const secrets = draft.kind === 'login' ? [draft.password] : draft.kind === 'apiKey' ? [draft.key] : draft.kind === 'wifi' ? [draft.password] : []
  if (secrets.some((secret) => secret.length > LIMITS.secret)) return `Terlalu panjang (maksimal ${LIMITS.secret} karakter).`
  if (draft.kind === 'login' && draft.urls.length > LIMITS.urls) return `Maksimal ${LIMITS.urls} alamat web.`
  if (draft.kind === 'apiKey' && draft.expiresAt && !/^\d{4}-\d{2}-\d{2}$/.test(draft.expiresAt)) return 'Tanggal kedaluwarsa tidak valid.'
  return null
}

/** Trims and de-duplicates; the shape the form hands to the store. */
export function cleanTags(input: string): string[] {
  const seen = new Set<string>()
  const tags: string[] = []
  for (const part of input.split(/[,\n]/)) {
    const tag = part.trim().slice(0, LIMITS.tag)
    const key = tag.toLocaleLowerCase('id-ID')
    if (tag && !seen.has(key)) {
      seen.add(key)
      tags.push(tag)
    }
  }
  return tags.slice(0, LIMITS.tags)
}

export function cleanUrls(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim().slice(0, LIMITS.url))
    .filter(Boolean)
    .slice(0, LIMITS.urls)
}

/** Only web links become clickable. Anything else (javascript:, data:, file:) stays plain text. */
export function safeHttpUrl(value: string): string | null {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}

/**
 * Text a search may match. Secret values (passwords, keys, history) are deliberately NOT in here, so a
 * search term never lights up an item because of its password.
 */
function searchable(item: VaultItemPayload): string[] {
  switch (item.kind) {
    case 'login':
      return [item.title, item.username, ...item.urls, item.notes, ...item.tags]
    case 'apiKey':
      return [item.title, item.service, item.notes, ...item.tags]
    case 'secureNote':
      return [item.title, item.body, ...item.tags]
    case 'wifi':
      return [item.ssid, item.notes]
  }
}

export interface VaultFilter {
  query: string
  kind: VaultItemKind | 'all'
}

/** Search runs over the decrypted items in memory only. Favourites first, then by title. */
export function filterAndSort(items: VaultItem[], { query, kind }: VaultFilter): VaultItem[] {
  const terms = query.toLocaleLowerCase('id-ID').split(/\s+/).filter(Boolean)
  return items
    .filter((item) => kind === 'all' || item.kind === kind)
    .filter((item) => {
      if (terms.length === 0) return true
      const haystack = searchable(item).join('\n').toLocaleLowerCase('id-ID')
      return terms.every((term) => haystack.includes(term))
    })
    .sort((a, b) => {
      const favoriteDelta = Number(isFavorite(b)) - Number(isFavorite(a))
      return favoriteDelta || itemTitle(a).localeCompare(itemTitle(b), 'id', { sensitivity: 'base' }) || a.id.localeCompare(b.id)
    })
}

export const isFavorite = (item: VaultItemPayload): boolean => item.kind !== 'wifi' && item.favorite

/** Whole days from `today` to `expiresAt` (yyyy-MM-dd). Negative when already expired. */
export function daysUntil(expiresAt: string, today: string): number {
  const dayMs = 86_400_000
  return Math.round((Date.parse(`${expiresAt}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs)
}

/** Keeps the previous password when it changed, newest first, at most 5. The history never holds the current password. */
export function nextHistory(previous: LoginPayload | null, nextPassword: string, now: string): PasswordHistoryEntry[] {
  if (!previous) return []
  const kept = previous.passwordHistory
  if (previous.password === nextPassword || previous.password === '') return kept.slice(0, PASSWORD_HISTORY_LIMIT)
  return [{ password: previous.password, replacedAt: now }, ...kept].slice(0, PASSWORD_HISTORY_LIMIT)
}
