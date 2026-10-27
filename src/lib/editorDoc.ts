import type { EditorDoc } from '@/types/domain'

export const EMPTY_DOC: EditorDoc = { type: 'doc', content: [{ type: 'paragraph' }] }

export const doc = (...blocks: EditorDoc[]): EditorDoc => ({ type: 'doc', content: blocks })
export const paragraph = (text: string): EditorDoc => ({ type: 'paragraph', content: [{ type: 'text', text }] })
export const quote = (text: string): EditorDoc => ({ type: 'blockquote', content: [paragraph(text)] })
export const checklist = (items: Array<[text: string, checked: boolean]>): EditorDoc => ({
  type: 'taskList',
  content: items.map(([text, checked]) => ({ type: 'taskItem', attrs: { checked }, content: [paragraph(text)] })),
})

/** Plain text of a document, with blocks separated by a single space. */
export function docToText(node: EditorDoc): string {
  const parts: string[] = []
  const walk = (current: EditorDoc) => {
    if (current.text) parts.push(current.text)
    if (!current.content) return
    const isBlock = current.type !== 'text'
    for (const child of current.content) {
      walk(child)
      if (isBlock && child.type !== 'text') parts.push('\n')
    }
  }
  walk(node)
  return parts
    .join('')
    .replace(/\s*\n\s*/g, ' ')
    .trim()
}

/** A short preview, cut at a word boundary when the text is longer than `max`. */
export function excerptOf(node: EditorDoc, max = 140): string {
  const text = docToText(node)
  if (text.length <= max) return text
  const cut = text.slice(0, max)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

export const isDocEmpty = (node: EditorDoc): boolean => docToText(node) === ''
