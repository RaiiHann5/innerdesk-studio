import { describe, expect, it } from 'vitest'
import type { NoteContent } from '@/types/domain'
import { excerptFromContent } from './excerpt'

const doc = (...content: NoteContent['content']): NoteContent => ({ type: 'doc', content })
const para = (value: string) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] })

describe('excerptFromContent', () => {
  it('returns plain text and keeps blocks apart', () => {
    const content = doc({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Judul' }] }, para('Isi catatan.'))
    expect(excerptFromContent(content)).toBe('Judul Isi catatan.')
  })

  it('reads text inside lists and task items', () => {
    const content = doc({
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: false }, content: [para('Kirim estimasi')] },
        { type: 'taskItem', attrs: { checked: true }, content: [para('Konfirmasi pembayaran')] },
      ],
    })
    expect(excerptFromContent(content)).toBe('Kirim estimasi Konfirmasi pembayaran')
  })

  it('is empty for an empty document', () => {
    expect(excerptFromContent(doc({ type: 'paragraph' }))).toBe('')
  })

  it('cuts at a word boundary and adds an ellipsis', () => {
    const content = doc(para('satu dua tiga empat lima enam tujuh delapan sembilan sepuluh'))
    const excerpt = excerptFromContent(content, 30)
    expect(excerpt).toBe('satu dua tiga empat lima enam…')
    expect(excerpt.length).toBeLessThanOrEqual(31)
  })

  it('leaves text under the limit untouched', () => {
    expect(excerptFromContent(doc(para('Singkat saja.')), 160)).toBe('Singkat saja.')
  })
})
