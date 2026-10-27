import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_PASSWORD_OPTIONS,
  DIGITS,
  LENGTH_MAX,
  LENGTH_MIN,
  LOOKALIKES,
  LOWER,
  SEPARATORS,
  SYMBOLS,
  UPPER,
  canGeneratePassword,
  generatePassphrase,
  generatePassword,
  randomInt,
} from './generator'
import { WORDLIST } from './wordlist'

afterEach(() => vi.restoreAllMocks())

const has = (value: string, set: string) => [...value].some((c) => set.includes(c))

describe('randomInt', () => {
  it('stays in range and covers every value', () => {
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const n = randomInt(7)
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(7)
      seen.add(n)
    }
    expect(seen.size).toBe(7)
    expect(randomInt(1)).toBe(0)
  })

  it('throws away draws that would make low values more likely (no modulo bias)', () => {
    // For max = 3 the largest safe draw is 4294967294; 4294967295 would favour 0 and must be rejected.
    const draws = [0xffffffff, 0xfffffffe, 7]
    const spy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = draws.shift()!
      return array
    }) as typeof crypto.getRandomValues)
    expect(randomInt(3)).toBe(0xfffffffe % 3)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('rejects impossible ranges', () => {
    for (const bad of [0, -1, 1.5, NaN, 2 ** 32 + 1]) expect(() => randomInt(bad)).toThrow(RangeError)
  })

  it('is statistically flat: no value strays far from its expected count', () => {
    const buckets = 9
    const draws = 90_000
    const counts = new Array<number>(buckets).fill(0)
    for (let i = 0; i < draws; i++) counts[randomInt(buckets)]++
    const expected = draws / buckets
    const chiSquare = counts.reduce((sum, c) => sum + (c - expected) ** 2 / expected, 0)
    // 8 degrees of freedom: 26.1 is the 0.1% critical value, so this fails by chance about once in a thousand runs at worst.
    expect(chiSquare).toBeLessThan(30)
  })
})

describe('generatePassword', () => {
  it('has the requested length and clamps to 8..64', () => {
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 }).value).toHaveLength(20)
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 3 }).value).toHaveLength(LENGTH_MIN)
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 500 }).value).toHaveLength(LENGTH_MAX)
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: NaN }).value).toHaveLength(LENGTH_MIN)
  })

  it('uses exactly the enabled classes, and every enabled class appears', () => {
    for (let run = 0; run < 200; run++) {
      const all = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 8 }).value
      for (const set of [LOWER, UPPER, DIGITS, SYMBOLS]) expect(has(all, set)).toBe(true)
    }
    for (const [name, flag, set] of [['lower', 'lower', LOWER], ['upper', 'upper', UPPER], ['digits', 'digits', DIGITS], ['symbols', 'symbols', SYMBOLS]] as const) {
      const only = { length: 24, lower: false, upper: false, digits: false, symbols: false, excludeLookalikes: false, [flag]: true }
      const { value } = generatePassword(only)
      expect([...value].every((c) => set.includes(c)), name).toBe(true)
    }
  })

  it('leaves out look-alike characters when asked', () => {
    for (let run = 0; run < 300; run++) {
      const { value } = generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 30, excludeLookalikes: true })
      expect([...value].some((c) => LOOKALIKES.includes(c))).toBe(false)
    }
  })

  it('refuses when no class is selected', () => {
    const none = { ...DEFAULT_PASSWORD_OPTIONS, lower: false, upper: false, digits: false, symbols: false }
    expect(canGeneratePassword(none)).toBe(false)
    expect(() => generatePassword(none)).toThrow(RangeError)
  })

  it('reports entropy as length x log2(pool)', () => {
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 20, upper: false, digits: false, symbols: false }).entropyBits).toBe(Math.floor(20 * Math.log2(26)))
    expect(generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, length: 20 }).entropyBits).toBe(Math.floor(20 * Math.log2(LOWER.length + UPPER.length + DIGITS.length + SYMBOLS.length)))
  })

  it('picks each character with the same frequency (no obvious bias)', () => {
    const options = { length: 64, lower: true, upper: false, digits: true, symbols: false, excludeLookalikes: false }
    const counts = new Map<string, number>()
    const pool = LOWER + DIGITS
    let total = 0
    for (let run = 0; run < 1500; run++) {
      for (const c of generatePassword(options).value) {
        counts.set(c, (counts.get(c) ?? 0) + 1)
        total++
      }
    }
    const expected = total / pool.length
    for (const c of pool) expect(Math.abs((counts.get(c) ?? 0) - expected) / expected, c).toBeLessThan(0.12)
  })

  it('does not repeat itself', () => {
    const seen = new Set(Array.from({ length: 500 }, () => generatePassword(DEFAULT_PASSWORD_OPTIONS).value))
    expect(seen.size).toBe(500)
  })
})

describe('generatePassphrase', () => {
  it('draws the requested number of words from the bundled list with the chosen separator', () => {
    for (const separator of SEPARATORS) {
      const { value } = generatePassphrase({ words: 6, separator })
      const words = value.split(separator)
      expect(words).toHaveLength(6)
      for (const word of words) expect(WORDLIST).toContain(word)
    }
  })

  it('clamps the word count to 3..10 and falls back to a hyphen for an unknown separator', () => {
    expect(generatePassphrase({ words: 1, separator: '-' }).value.split('-')).toHaveLength(3)
    expect(generatePassphrase({ words: 99, separator: '-' }).value.split('-')).toHaveLength(10)
    expect(generatePassphrase({ words: 4, separator: '/' as never }).value.split('-')).toHaveLength(4)
  })

  it('reports entropy from the real list size', () => {
    expect(generatePassphrase({ words: 6, separator: '-' }).entropyBits).toBe(Math.floor(6 * Math.log2(WORDLIST.length)))
  })
})

describe('word list', () => {
  it('is large, distinct, lower case and offline', () => {
    expect(WORDLIST.length).toBeGreaterThanOrEqual(800)
    expect(new Set(WORDLIST).size).toBe(WORDLIST.length)
    for (const word of WORDLIST) expect(word).toMatch(/^[a-z]{4,8}$/)
  })
})
