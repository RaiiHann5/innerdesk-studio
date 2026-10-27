import { describe, expect, it } from 'vitest'
import { HOUR_HEIGHT, minutesToPx, timezoneLabel } from './timeGeometry'

describe('timezoneLabel', () => {
  it.each([
    [480, 'UTC+8'],
    [330, 'UTC+5:30'],
    [-180, 'UTC-3'],
    [0, 'UTC'],
  ])('formats %i minutes as %s', (offset, label) => {
    expect(timezoneLabel(offset)).toBe(label)
  })
})

describe('minutesToPx', () => {
  it('scales an hour to the hour height', () => {
    expect(minutesToPx(60)).toBe(HOUR_HEIGHT)
    expect(minutesToPx(90)).toBe(HOUR_HEIGHT * 1.5)
  })
})
