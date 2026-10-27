import { describe, expect, it } from 'vitest'
import type { NoteContent, NoteNode } from '@/types/domain'
import { BUILTIN_TEMPLATES, DATE_PLACEHOLDER, applyTemplate, outlineOf, previewOf, templateFromNote, toSource } from './templates'

// Sunday, 25 October 2026.
const NOW = new Date(2026, 9, 25, 9, 0, 0)

const NODE_TYPES = new Set(['paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem', 'text', 'horizontalRule'])
const MARK_TYPES = new Set(['bold', 'italic'])

function walk(node: NoteNode, visit: (node: NoteNode) => void) {
  visit(node)
  node.content?.forEach((child) => walk(child, visit))
}

describe('built-in templates', () => {
  it('have unique ids and names, and say what they are for', () => {
    expect(new Set(BUILTIN_TEMPLATES.map((t) => t.id)).size).toBe(BUILTIN_TEMPLATES.length)
    expect(new Set(BUILTIN_TEMPLATES.map((t) => t.name)).size).toBe(BUILTIN_TEMPLATES.length)
    for (const t of BUILTIN_TEMPLATES) {
      expect(t.name.trim()).not.toBe('')
      expect(t.description.trim()).not.toBe('')
      expect(t.builtin).toBe(true)
    }
  })

  it('use only nodes and marks the editor can load', () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const top of t.content.content) {
        walk(top, (node) => {
          expect(NODE_TYPES.has(node.type), `${t.name}: ${node.type}`).toBe(true)
          node.marks?.forEach((m) => expect(MARK_TYPES.has(m.type)).toBe(true))
          // The editor allows headings up to level 3, and templates stay on 2 so they sit under the note title.
          if (node.type === 'heading') expect(node.attrs?.level).toBe(2)
          // ProseMirror rejects a text node with no text.
          if (node.type === 'text') expect(node.text).toBeTruthy()
        })
      }
    }
  })

  it('give every list at least one item and every item a paragraph', () => {
    for (const t of BUILTIN_TEMPLATES) {
      for (const top of t.content.content) {
        walk(top, (node) => {
          if (['bulletList', 'orderedList', 'taskList'].includes(node.type)) expect(node.content?.length).toBeGreaterThan(0)
          if (node.type === 'listItem' || node.type === 'taskItem') expect(node.content?.[0].type).toBe('paragraph')
          if (node.type === 'taskItem') expect(node.attrs?.checked).toBe(false)
        })
      }
    }
  })

  it('each have something in them to preview', () => {
    for (const t of BUILTIN_TEMPLATES.filter((x) => x.id !== 'builtin-checklist')) expect(previewOf(t).length).toBeGreaterThan(0)
  })
})

describe('outlineOf', () => {
  it('lists the headings in order', () => {
    const meeting = BUILTIN_TEMPLATES.find((t) => t.id === 'builtin-rapat')!
    expect(outlineOf(meeting)).toBe('Peserta · Agenda · Keputusan · Tindak lanjut')
  })
  it('is empty for a template without headings', () => {
    expect(outlineOf(BUILTIN_TEMPLATES.find((t) => t.id === 'builtin-checklist')!)).toBe('')
  })
})

describe('applyTemplate', () => {
  const meeting = BUILTIN_TEMPLATES.find((t) => t.id === 'builtin-rapat')!

  it('writes the date into the title', () => {
    expect(meeting.title).toContain(DATE_PLACEHOLDER)
    const start = applyTemplate(meeting, NOW)
    expect(start.title).toBe('Rapat Minggu, 25 Oktober 2026')
    expect(start.title).not.toContain('{{')
  })

  it('writes the date into the body too, wherever it sits', () => {
    const decision = BUILTIN_TEMPLATES.find((t) => t.id === 'builtin-keputusan')!
    const start = applyTemplate(decision, NOW)
    expect(JSON.stringify(start.content)).toContain('Dicatat Minggu, 25 Oktober 2026')
    expect(JSON.stringify(start.content)).not.toContain('{{')
  })

  it('does not change the template it copies from', () => {
    const decision = BUILTIN_TEMPLATES.find((t) => t.id === 'builtin-keputusan')!
    const before = JSON.stringify(decision)
    const start = applyTemplate(decision, NOW)
    ;(start.content.content[0].content![0] as NoteNode).text = 'diubah'
    start.tags.push('baru')
    expect(JSON.stringify(decision)).toBe(before)
  })

  it('gives the new note its tags and an excerpt', () => {
    const start = applyTemplate(meeting, NOW)
    expect(start.tags).toEqual(['rapat'])
    expect(start.excerpt).toContain('Peserta')
  })

  it('keeps the checkboxes unchecked', () => {
    const start = applyTemplate(meeting, NOW)
    const boxes: NoteNode[] = []
    start.content.content.forEach((n) => walk(n, (x) => x.type === 'taskItem' && boxes.push(x)))
    expect(boxes.length).toBeGreaterThan(0)
    expect(boxes.every((b) => b.attrs?.checked === false)).toBe(true)
  })
})

describe('templateFromNote', () => {
  const content: NoteContent = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Isi' }] }] }

  it('takes title, content and tags, and trims the name', () => {
    const t = templateFromNote({ title: 'Judul', content, tags: ['a'] }, '  Punyaku  ', '  Untuk rapat mingguan ')
    expect(t).toMatchObject({ name: 'Punyaku', description: 'Untuk rapat mingguan', title: 'Judul', tags: ['a'] })
  })

  it('copies the content so later edits to the note do not reach the template', () => {
    const t = templateFromNote({ title: '', content, tags: [] }, 'Salinan')
    ;(content.content[0].content![0] as NoteNode).text = 'Berubah'
    expect(JSON.stringify(t.content)).toContain('Isi')
  })

  it('leaves the description out when it is blank', () => {
    expect(templateFromNote({ title: '', content, tags: [] }, 'X', '   ').description).toBeUndefined()
  })

  it('round-trips through the picker shape', () => {
    const stored = { ...templateFromNote({ title: 'T', content, tags: ['x'] }, 'N', 'D'), id: 'ntpl-1', createdAt: '', updatedAt: '' }
    expect(toSource(stored)).toMatchObject({ id: 'ntpl-1', name: 'N', description: 'D', title: 'T', tags: ['x'], builtin: false })
  })
})
