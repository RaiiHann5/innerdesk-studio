export const normalizeTag = (raw: string): string => raw.trim().toLowerCase().replace(/\s+/g, ' ')

/** Adds a tag after trimming and lowercasing it. Returns the same array when the tag is empty or already there. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = normalizeTag(raw)
  return !tag || tags.includes(tag) ? tags : [...tags, tag]
}

/** Tags already in use that start with what is typed and are not on this note yet. */
export function suggestTags(all: string[], current: string[], typed: string, limit = 6): string[] {
  const term = normalizeTag(typed)
  return all.filter((tag) => !current.includes(tag) && tag.startsWith(term)).slice(0, limit)
}
