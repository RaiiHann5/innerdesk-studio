import { WORDLIST } from './wordlist'

/**
 * Password and passphrase generator. Every random choice goes through `randomInt`, which uses
 * crypto.getRandomValues with rejection sampling, so no value is more likely than another (no modulo bias).
 * Nothing here touches the network or logs anything.
 */
export const LENGTH_MIN = 8
export const LENGTH_MAX = 64
export const LENGTH_DEFAULT = 20
export const WORDS_MIN = 3
export const WORDS_MAX = 10
export const WORDS_DEFAULT = 6

export const LOWER = 'abcdefghijklmnopqrstuvwxyz'
export const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
export const DIGITS = '0123456789'
/** No quotes, backslash, slash, space or angle brackets, which are the characters forms and shells trip over. */
export const SYMBOLS = '!@#$%^&*()-_=+[]{}:;,.?'
export const LOOKALIKES = 'ilIL1oO0|'

export interface PasswordOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  excludeLookalikes: boolean
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: LENGTH_DEFAULT,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeLookalikes: false,
}

export const SEPARATORS = ['-', '.', '_', ' '] as const
export type Separator = (typeof SEPARATORS)[number]

export interface PassphraseOptions {
  words: number
  separator: Separator
}

export const DEFAULT_PASSPHRASE_OPTIONS: PassphraseOptions = { words: WORDS_DEFAULT, separator: '-' }

export interface Generated {
  value: string
  /** log2 of the number of equally likely results the options allow. Shown as "bit". */
  entropyBits: number
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number.isFinite(value) ? value : min)))

/** Uniform integer in [0, max). Rejection sampling on 32-bit draws: a draw that would wrap around unevenly is thrown away. */
export function randomInt(max: number): number {
  if (!Number.isInteger(max) || max < 1 || max > 2 ** 32) throw new RangeError('max out of range')
  if (max === 1) return 0
  const limit = Math.floor(2 ** 32 / max) * max
  const draw = new Uint32Array(1)
  for (;;) {
    globalThis.crypto.getRandomValues(draw)
    if (draw[0] < limit) return draw[0] % max
  }
}

const pick = (source: string | readonly string[]): string => source[randomInt(source.length)]

function classes(options: PasswordOptions): string[] {
  const strip = (set: string) => (options.excludeLookalikes ? [...set].filter((c) => !LOOKALIKES.includes(c)).join('') : set)
  return [options.lower && LOWER, options.upper && UPPER, options.digits && DIGITS, options.symbols && SYMBOLS]
    .filter((set): set is string => set !== false)
    .map(strip)
}

/** True when the options can produce a password: at least one character class is on. */
export const canGeneratePassword = (options: PasswordOptions): boolean => classes(options).length > 0

/**
 * Draws uniformly from the allowed characters and starts over until every enabled class appears at least once.
 * Starting over (rather than patching in required characters) keeps every valid password equally likely.
 * `entropyBits` is length x log2(pool), an upper bound: demanding every class removes well under a bit at 12+ characters.
 */
export function generatePassword(input: PasswordOptions): Generated {
  const options = { ...input, length: clamp(input.length, LENGTH_MIN, LENGTH_MAX) }
  const sets = classes(options)
  if (sets.length === 0) throw new RangeError('no character class selected')
  const pool = sets.join('')
  for (;;) {
    let value = ''
    for (let i = 0; i < options.length; i++) value += pick(pool)
    if (sets.every((set) => [...set].some((char) => value.includes(char)))) {
      return { value, entropyBits: Math.floor(options.length * Math.log2(pool.length)) }
    }
  }
}

export function generatePassphrase(input: PassphraseOptions): Generated {
  const count = clamp(input.words, WORDS_MIN, WORDS_MAX)
  const separator = SEPARATORS.includes(input.separator) ? input.separator : '-'
  const words = Array.from({ length: count }, () => pick(WORDLIST))
  return { value: words.join(separator), entropyBits: Math.floor(count * Math.log2(WORDLIST.length)) }
}
