import { describe, expect, it } from 'vitest'
import { addTag, hasTag, removeTag, TAG_MAX_COUNT } from './tags'

describe('tags', () => {
  it('trims, strips a leading # and adds', () => {
    expect(addTag([], '  #Ngopi  ')).toEqual(['Ngopi'])
  })

  it('ignores blanks and duplicates regardless of case', () => {
    const tags = ['Kerja']
    expect(addTag(tags, '   ')).toBe(tags)
    expect(addTag(tags, 'kerja')).toBe(tags)
  })

  it('uses the suggested spelling for a known tag', () => {
    expect(addTag([], 'belajar')).toEqual(['Belajar'])
  })

  it('stops at the limit', () => {
    const full = Array.from({ length: TAG_MAX_COUNT }, (_, i) => `t${i}`)
    expect(addTag(full, 'baru')).toBe(full)
  })

  it('removes and finds without caring about case', () => {
    expect(removeTag(['Kerja', 'Growth'], 'kerja')).toEqual(['Growth'])
    expect(hasTag(['Kerja'], 'KERJA')).toBe(true)
    expect(hasTag(undefined, 'Kerja')).toBe(false)
  })
})
