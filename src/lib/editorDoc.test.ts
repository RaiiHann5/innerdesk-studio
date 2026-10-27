import { describe, expect, it } from 'vitest'
import { EMPTY_DOC, checklist, doc, docToText, excerptOf, isDocEmpty, paragraph, quote } from './editorDoc'

describe('docToText', () => {
  it('joins blocks with a single space', () => {
    expect(docToText(doc(paragraph('Satu.'), paragraph('Dua.')))).toBe('Satu. Dua.')
  })

  it('reads text inside quotes and checklists', () => {
    const value = doc(quote('Pelan-pelan.'), checklist([['Cuci piring', true], ['Balas surel', false]]))
    expect(docToText(value)).toBe('Pelan-pelan. Cuci piring Balas surel')
  })
})

describe('excerptOf', () => {
  it('returns short text unchanged', () => {
    expect(excerptOf(doc(paragraph('Singkat.')))).toBe('Singkat.')
  })

  it('cuts long text at a word boundary and marks the cut', () => {
    const long = doc(paragraph('kata '.repeat(60).trim()))
    const out = excerptOf(long, 50)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(51)
    expect(out.endsWith('kat…')).toBe(false)
  })
})

describe('isDocEmpty', () => {
  it('is true for the empty document and false once there is text', () => {
    expect(isDocEmpty(EMPTY_DOC)).toBe(true)
    expect(isDocEmpty(doc(paragraph('Halo')))).toBe(false)
  })
})
