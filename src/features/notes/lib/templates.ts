import { fmt } from '@/lib/date'
import type { NewEntity, Note, NoteContent, NoteNode, NoteTemplate } from '@/types/domain'
import { excerptFromContent } from './excerpt'

/** A template as the picker and `applyTemplate` see it, whether it ships with the app or the person saved it. */
export interface TemplateSource {
  id: string
  name: string
  description: string
  /** May hold {{tanggal}}. Empty means the note starts untitled. */
  title: string
  content: NoteContent
  tags: string[]
  builtin: boolean
}

/** Replaced with today's date, written out ("Minggu, 25 Oktober 2026"), in the title and in every piece of text. */
export const DATE_PLACEHOLDER = '{{tanggal}}'

// Node builders. The type names match the editor's schema, so a template loads into it as is.
// An empty string makes an empty paragraph: ProseMirror does not allow a text node with no text.
const para = (value = ''): NoteNode => (value ? { type: 'paragraph', content: [{ type: 'text', text: value }] } : { type: 'paragraph' })
const heading = (value: string): NoteNode => ({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: value }] })
const quote = (value = ''): NoteNode => ({ type: 'blockquote', content: [para(value)] })
const item = (value = ''): NoteNode => ({ type: 'listItem', content: [para(value)] })
const bullets = (...list: string[]): NoteNode => ({ type: 'bulletList', content: (list.length ? list : ['']).map(item) })
const numbered = (...list: string[]): NoteNode => ({ type: 'orderedList', content: (list.length ? list : ['']).map(item) })
const checklist = (...list: string[]): NoteNode => ({
  type: 'taskList',
  content: (list.length ? list : ['']).map((value) => ({ type: 'taskItem', attrs: { checked: false }, content: [para(value)] })),
})
const doc = (...content: NoteNode[]): NoteContent => ({ type: 'doc', content })

const builtin = (id: string, name: string, description: string, title: string, tags: string[], content: NoteContent): TemplateSource => ({
  id: `builtin-${id}`,
  name,
  description,
  title,
  tags,
  content,
  builtin: true,
})

export const BUILTIN_TEMPLATES: TemplateSource[] = [
  builtin(
    'rapat',
    'Catatan rapat',
    'Peserta, agenda, keputusan, dan siapa mengerjakan apa.',
    `Rapat ${DATE_PLACEHOLDER}`,
    ['rapat'],
    doc(heading('Peserta'), bullets(), heading('Agenda'), numbered(), heading('Keputusan'), bullets(), heading('Tindak lanjut'), checklist()),
  ),
  builtin(
    'brief',
    'Brief project',
    'Latar belakang, tujuan, batasan, dan langkah pertama sebelum mulai.',
    'Brief project',
    ['project'],
    doc(
      heading('Latar belakang'),
      para(),
      heading('Tujuan'),
      para('Satu kalimat tentang hasil yang ingin dicapai.'),
      heading('Ruang lingkup'),
      bullets('Termasuk: ', 'Tidak termasuk: '),
      heading('Target waktu'),
      para(),
      heading('Risiko'),
      bullets(),
      heading('Langkah pertama'),
      checklist(),
    ),
  ),
  builtin(
    'keputusan',
    'Catatan keputusan',
    'Merekam kenapa sebuah pilihan diambil, supaya tidak diperdebatkan ulang.',
    'Keputusan: ',
    ['keputusan'],
    doc(
      para(`Dicatat ${DATE_PLACEHOLDER}`),
      heading('Konteks'),
      para(),
      heading('Pilihan yang dipertimbangkan'),
      numbered(),
      heading('Keputusan'),
      quote(),
      heading('Alasan'),
      bullets(),
      heading('Konsekuensi'),
      bullets(),
    ),
  ),
  builtin(
    'retro',
    'Retrospektif',
    'Melihat kembali satu periode kerja: yang berjalan baik, yang tidak, dan yang dicoba berikutnya.',
    `Retrospektif ${DATE_PLACEHOLDER}`,
    ['retrospektif'],
    doc(heading('Berjalan baik'), bullets(), heading('Kurang berjalan'), bullets(), heading('Pelajaran'), bullets(), heading('Dicoba berikutnya'), checklist()),
  ),
  builtin(
    'mingguan',
    'Rencana pekan ini',
    'Fokus utama, prioritas, dan jadwal penting untuk satu pekan.',
    `Rencana pekan ${DATE_PLACEHOLDER}`,
    ['mingguan'],
    doc(
      heading('Fokus utama'),
      para('Satu hal yang paling penting pekan ini.'),
      heading('Prioritas'),
      checklist('', '', ''),
      heading('Jadwal penting'),
      bullets(),
      heading('Sedang menunggu'),
      bullets(),
      heading('Refleksi akhir pekan'),
      para(),
    ),
  ),
  builtin(
    'belajar',
    'Catatan belajar',
    'Merangkum sesuatu yang dipelajari dengan kata-katamu sendiri.',
    'Belajar: ',
    ['belajar'],
    doc(
      heading('Sumber'),
      para(),
      heading('Ide utama'),
      bullets(),
      heading('Penerapan'),
      para('Di mana ini bisa dipakai dalam pekerjaanku?'),
      heading('Pertanyaan yang tersisa'),
      bullets(),
      heading('Dalam satu kalimat'),
      quote(),
    ),
  ),
  builtin('checklist', 'Daftar periksa', 'Daftar centang kosong untuk sesuatu yang dikerjakan berulang.', 'Daftar periksa', [], doc(checklist('', '', ''))),
]

/** What a stored template looks like to the picker. */
export const toSource = (template: NoteTemplate): TemplateSource => ({
  id: template.id,
  name: template.name,
  description: template.description ?? '',
  title: template.title,
  content: template.content,
  tags: template.tags,
  builtin: false,
})

/** The section headings, as one line: what the template asks you to fill in. */
export function outlineOf(source: TemplateSource): string {
  const names: string[] = []
  for (const node of source.content.content) {
    if (node.type === 'heading') {
      const text = (node.content ?? []).map((c) => c.text ?? '').join('').trim()
      if (text) names.push(text)
    }
  }
  return names.join(' · ')
}

/** A short plain-text peek at what the template contains, for the picker. */
export const previewOf = (source: TemplateSource): string => excerptFromContent(source.content, 90)

function fill(node: NoteNode, date: string): NoteNode {
  const copy: NoteNode = { ...node }
  if (node.attrs) copy.attrs = { ...node.attrs }
  if (node.marks) copy.marks = node.marks.map((m) => ({ ...m }))
  if (node.text !== undefined) copy.text = node.text.split(DATE_PLACEHOLDER).join(date)
  if (node.content) copy.content = node.content.map((child) => fill(child, date))
  return copy
}

export interface NoteStart {
  title: string
  content: NoteContent
  tags: string[]
  excerpt: string
}

/**
 * The starting point for a new note. The template is copied, never changed: the built-in ones are shared constants and a
 * stored one is the person's original. A text node that ends up empty cannot happen, because {{tanggal}} is only ever replaced by a date.
 */
export function applyTemplate(source: TemplateSource, now: Date = new Date()): NoteStart {
  const date = fmt(now, 'EEEE, d MMMM yyyy')
  const content: NoteContent = { type: 'doc', content: source.content.content.map((node) => fill(node, date)) }
  return {
    title: source.title.split(DATE_PLACEHOLDER).join(date),
    content,
    tags: [...source.tags],
    excerpt: excerptFromContent(content),
  }
}

/** The part of a note worth reusing. Pin, project and archive belong to that one note, so they stay behind. */
export function templateFromNote(note: Pick<Note, 'title' | 'content' | 'tags'>, name: string, description?: string): NewEntity<NoteTemplate> {
  return {
    name: name.trim(),
    description: description?.trim() || undefined,
    title: note.title,
    content: JSON.parse(JSON.stringify(note.content)) as NoteContent,
    tags: [...note.tags],
  }
}
