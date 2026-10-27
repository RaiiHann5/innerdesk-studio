import { describe, expect, it } from 'vitest'
import { addTag, normalizeTag, suggestTags } from './tags'

describe('addTag', () => {
  it('trims and lowercases', () => {
    expect(addTag([], '  Riset  ')).toEqual(['riset'])
    expect(normalizeTag('Ide   Baru')).toBe('ide baru')
  })

  it('ignores empty input and duplicates', () => {
    const tags = ['riset']
    expect(addTag(tags, '   ')).toBe(tags)
    expect(addTag(tags, 'RISET')).toBe(tags)
  })
})

describe('suggestTags', () => {
  it('suggests unused tags by prefix and skips the ones already on the note', () => {
    expect(suggestTags(['riset', 'rapat', 'ide'], ['rapat'], 'r')).toEqual(['riset'])
  })

  it('offers everything unused for an empty input, capped by the limit', () => {
    expect(suggestTags(['a', 'b', 'c'], [], '', 2)).toEqual(['a', 'b'])
  })
})
