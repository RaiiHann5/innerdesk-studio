import type { ProjectLinkItem, ProjectLinkKind } from '@/types/domain'

export const LINK_KINDS: readonly ProjectLinkKind[] = ['akun', 'dokumen', 'desain', 'lainnya']

export const LINK_KIND_LABEL: Record<ProjectLinkKind, string> = {
  akun: 'Akun',
  dokumen: 'Dokumen',
  desain: 'Desain',
  lainnya: 'Lainnya',
}

/** Query or fragment parameters that carry a secret. A link holding one is refused, not stored. */
const SECRET_PARAM = /^(password|passwd|pwd|pass|secret|token|access_token|refresh_token|id_token|auth|authorization|api[-_]?key|apikey|client_secret|session|sessionid|sid)$/i

export type UrlCheck = { ok: true; url: string } | { ok: false; error: string }

/**
 * Checks a link before it is stored. Only web addresses are kept: http and https. A bare address such as
 * "figma.com/file/x" gets https. Addresses with a username or password in them, or with a secret in the
 * query or fragment, are refused: this app keeps links to accounts, never the credentials for them.
 */
export function checkLinkUrl(raw: string): UrlCheck {
  const input = raw.trim()
  if (!input) return { ok: false, error: 'Alamat tautan wajib diisi.' }
  if (/\s/.test(input)) return { ok: false, error: 'Alamat tautan tidak boleh memuat spasi.' }

  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(input) && !/^[^/]*:\d+(\/|$)/.test(input)
  const candidate = hasScheme ? input : `https://${input}`
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    return { ok: false, error: 'Alamat tautan tidak valid.' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return { ok: false, error: 'Hanya alamat web (http atau https) yang bisa disimpan.' }
  if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') return { ok: false, error: 'Alamat tautan tidak valid.' }
  if (parsed.username || parsed.password) return { ok: false, error: 'Tautan tidak boleh memuat nama pengguna atau kata sandi.' }

  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ''))
  for (const key of [...parsed.searchParams.keys(), ...fragment.keys()]) {
    if (SECRET_PARAM.test(key)) return { ok: false, error: 'Tautan tidak boleh memuat kata sandi atau token.' }
  }
  return { ok: true, url: parsed.toString() }
}

/** The address to put in an href, or null when stored data holds anything other than a plain web address. */
export function safeHref(url: string): string | null {
  try {
    const parsed = new URL(url)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !parsed.username && !parsed.password ? parsed.toString() : null
  } catch {
    return null
  }
}

/** "figma.com" for display, without www and without the path. */
export function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

export interface LinkGroup {
  kind: ProjectLinkKind
  links: ProjectLinkItem[]
}

/** Links grouped by kind in a fixed order. Kinds with no link are left out. */
export const groupLinks = (links: readonly ProjectLinkItem[]): LinkGroup[] =>
  LINK_KINDS.map((kind) => ({ kind, links: links.filter((l) => l.kind === kind) })).filter((g) => g.links.length > 0)

export const newLinkId = (): string => `l-${Math.random().toString(36).slice(2, 10)}`
