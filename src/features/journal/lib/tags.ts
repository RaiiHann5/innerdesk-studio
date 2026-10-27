import { Briefcase, ChatCircleDots, Coffee, HouseLine, Lightning, Plant, BookOpen, Heartbeat, type Icon } from '@phosphor-icons/react'

export const SUGGESTED_TAGS: Array<{ label: string; icon: Icon }> = [
  { label: 'Kerja', icon: Briefcase },
  { label: 'Keluarga', icon: HouseLine },
  { label: 'Kesehatan', icon: Heartbeat },
  { label: 'Produktif', icon: Lightning },
  { label: 'Istirahat', icon: Coffee },
  { label: 'Growth', icon: Plant },
  { label: 'Belajar', icon: BookOpen },
  { label: 'Hubungan', icon: ChatCircleDots },
]

export const TAG_MAX_LENGTH = 24
export const TAG_MAX_COUNT = 12

const same = (a: string, b: string) => a.toLocaleLowerCase('id') === b.toLocaleLowerCase('id')

/** Adds a tag unless it is blank, too many, or already there (ignoring case). Returns the same array when nothing changed. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim().replace(/^#/, '').replace(/\s+/g, ' ').slice(0, TAG_MAX_LENGTH)
  if (tag === '' || tags.length >= TAG_MAX_COUNT || tags.some((t) => same(t, tag))) return tags
  // A typed tag that matches a suggested one takes the suggested spelling, so "kerja" and "Kerja" are one tag.
  const known = SUGGESTED_TAGS.find((s) => same(s.label, tag))
  return [...tags, known?.label ?? tag]
}

export const removeTag = (tags: string[], tag: string): string[] => tags.filter((t) => !same(t, tag))

export const hasTag = (tags: string[] | undefined, tag: string): boolean => (tags ?? []).some((t) => same(t, tag))
