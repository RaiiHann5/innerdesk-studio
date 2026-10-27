import { describe, expect, it } from 'vitest'
import { mergeTags, parseTags } from './taskFields'

describe('taskFields', () => {
  it('parses a comma list', () => {
    expect(parseTags(' frontend , revisi,, frontend ')).toEqual(['frontend', 'revisi'])
    expect(parseTags('')).toEqual([])
  })

  it('merges tags keeping the existing order', () => {
    expect(mergeTags(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c'])
    expect(mergeTags([], [])).toEqual([])
  })
})
