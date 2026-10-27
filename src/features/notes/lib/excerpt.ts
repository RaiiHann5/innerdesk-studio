import type { NoteContent, NoteNode } from '@/types/domain'

export const EXCERPT_LENGTH = 160

function collect(node: NoteNode, parts: string[]): void {
  if (node.text) parts.push(node.text)
  node.content?.forEach((child) => collect(child, parts))
  // Every block and line break ends with a space, so "judul" and the paragraph under it never fuse.
  if (node.type !== 'text') parts.push(' ')
}

/** Plain text of the document, cut at a word boundary near `limit` characters. */
export function excerptFromContent(content: NoteContent, limit = EXCERPT_LENGTH): string {
  const parts: string[] = []
  content.content.forEach((node) => collect(node, parts))
  const text = parts.join('').replace(/\s+/g, ' ').trim()
  if (text.length <= limit) return text

  const head = text.slice(0, limit)
  const lastSpace = head.lastIndexOf(' ')
  const cut = lastSpace > limit * 0.6 ? head.slice(0, lastSpace) : head
  return `${cut.replace(/[\s.,;:!?-]+$/, '')}…`
}
