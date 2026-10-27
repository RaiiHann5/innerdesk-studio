import type { ChainedCommands } from '@tiptap/react'
import { CodeBlock, ListBullets, ListChecks, ListNumbers, Minus, Quotes, TextHOne, TextHThree, TextHTwo, type Icon } from '@phosphor-icons/react'

export interface Block {
  id: string
  label: string
  /** The markdown that produces the same block, shown as a hint in the slash menu. */
  shortcut: string
  /** Extra words the slash menu also matches, in Indonesian and in the usual English names. */
  keywords: string[]
  icon: Icon
  apply: (chain: ChainedCommands) => ChainedCommands
}

export const BLOCKS: Block[] = [
  { id: 'h1', label: 'Judul 1', shortcut: '#', keywords: ['heading', 'h1', 'judul besar'], icon: TextHOne, apply: (c) => c.setNode('heading', { level: 1 }) },
  { id: 'h2', label: 'Judul 2', shortcut: '##', keywords: ['heading', 'h2', 'subjudul'], icon: TextHTwo, apply: (c) => c.setNode('heading', { level: 2 }) },
  { id: 'h3', label: 'Judul 3', shortcut: '###', keywords: ['heading', 'h3'], icon: TextHThree, apply: (c) => c.setNode('heading', { level: 3 }) },
  { id: 'bullet', label: 'Daftar poin', shortcut: '-', keywords: ['bullet', 'list', 'daftar', 'ul'], icon: ListBullets, apply: (c) => c.toggleBulletList() },
  { id: 'ordered', label: 'Daftar nomor', shortcut: '1.', keywords: ['numbered', 'ordered', 'list', 'ol'], icon: ListNumbers, apply: (c) => c.toggleOrderedList() },
  { id: 'task', label: 'Daftar centang', shortcut: '[ ]', keywords: ['checklist', 'todo', 'task', 'tugas'], icon: ListChecks, apply: (c) => c.toggleTaskList() },
  { id: 'quote', label: 'Kutipan', shortcut: '>', keywords: ['quote', 'blockquote'], icon: Quotes, apply: (c) => c.toggleBlockquote() },
  { id: 'code', label: 'Blok kode', shortcut: '```', keywords: ['code', 'kode', 'snippet'], icon: CodeBlock, apply: (c) => c.toggleCodeBlock() },
  { id: 'divider', label: 'Pemisah', shortcut: '---', keywords: ['divider', 'hr', 'garis', 'separator'], icon: Minus, apply: (c) => c.setHorizontalRule() },
]

/** Blocks whose label or keywords contain what was typed after the slash. */
export function filterBlocks(query: string): Block[] {
  const term = query.trim().toLowerCase()
  if (!term) return BLOCKS
  return BLOCKS.filter((block) => [block.label, ...block.keywords].some((word) => word.toLowerCase().includes(term)))
}
