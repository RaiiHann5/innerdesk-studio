import type { CurrencyCode } from '@/types/domain'

/**
 * Money is an integer in the currency's minor unit (IDR 0 decimals, USD 2) next to its code.
 * Nothing here multiplies or divides a float: parsing and conversion use BigInt on decimal digits.
 */

export class MoneyError extends Error {}

export interface Money {
  amountMinor: number
  currency: CurrencyCode
}

interface CurrencyInfo {
  decimals: number
  symbol: string
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  IDR: { decimals: 0, symbol: 'Rp' },
  USD: { decimals: 2, symbol: 'US$' },
  EUR: { decimals: 2, symbol: 'EUR' },
  SGD: { decimals: 2, symbol: 'S$' },
  JPY: { decimals: 0, symbol: 'JPY' },
}
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[]

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  typeof v === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, v)

export const decimalsOf = (currency: CurrencyCode): number => CURRENCIES[currency].decimals

/** True for a whole number JavaScript can add exactly. */
export const isMinor = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v)

const checked = (n: number): number => {
  if (!Number.isSafeInteger(n)) throw new MoneyError('Nominal terlalu besar.')
  return n
}

/** Sum of integers in one currency. Throws instead of returning an inexact total. */
export function sumMinor(values: readonly number[]): number {
  let total = 0
  for (const v of values) total = checked(total + checked(v))
  return total
}

function assertSame(a: Money, b: Money) {
  if (a.currency !== b.currency) throw new MoneyError(`Mata uang berbeda: ${a.currency} dan ${b.currency}.`)
}

export function add(a: Money, b: Money): Money {
  assertSame(a, b)
  return { amountMinor: sumMinor([a.amountMinor, b.amountMinor]), currency: a.currency }
}

export function compare(a: Money, b: Money): -1 | 0 | 1 {
  assertSame(a, b)
  return a.amountMinor < b.amountMinor ? -1 : a.amountMinor > b.amountMinor ? 1 : 0
}

// ---------------------------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------------------------

/** Multipliers in whole currency units. "m" means miliar, matching the compact format. */
const SUFFIX: Record<string, bigint> = {
  rb: 1_000n,
  ribu: 1_000n,
  k: 1_000n,
  jt: 1_000_000n,
  juta: 1_000_000n,
  m: 1_000_000_000n,
  miliar: 1_000_000_000n,
}
const SYMBOL_PREFIX = /^(?:rp\.?|idr|us\$|usd|s\$|sgd|eur|jpy|\$)\s*/i
const NUMBER = /^(\d[\d.,]*)\s*(rb|ribu|jt|juta|miliar|k|m)?$/i

/**
 * Splits "1.250.000", "1,5", "450.50" or "1.250.000,50" into integer and fraction digits.
 * Indonesian grouping (dots) and decimals (commas) are expected, but English input works too.
 * A single separator followed by exactly three digits is grouping ("1.250" is 1250), except a dot in a
 * currency with decimals ("450.555" USD), which is ambiguous and rejected.
 */
function splitNumber(raw: string, maxFraction: number, dotIsDecimal: boolean): { int: string; frac: string } | null {
  if (/[.,]$/.test(raw) || /[.,]{2}/.test(raw)) return null
  const dots = raw.split('.').length - 1
  const commas = raw.split(',').length - 1
  const grouped = (s: string, sep: string) => /^\d{1,3}$/.test(s.split(sep)[0]) && s.split(sep).slice(1).every((g) => /^\d{3}$/.test(g))

  if (dots && commas) {
    const decSep = raw.lastIndexOf('.') > raw.lastIndexOf(',') ? '.' : ','
    const groupSep = decSep === '.' ? ',' : '.'
    const parts = raw.split(decSep)
    if (parts.length !== 2 || !grouped(parts[0], groupSep) || parts[1].includes(groupSep)) return null
    return { int: parts[0].split(groupSep).join(''), frac: parts[1] }
  }
  const sep = dots ? '.' : commas ? ',' : null
  if (!sep) return { int: raw, frac: '' }
  const count = dots || commas
  if (count > 1) return grouped(raw, sep) ? { int: raw.split(sep).join(''), frac: '' } : null
  const [head, tail] = raw.split(sep)
  // In a currency with decimals, "450.555" could be a typo for 450.55 or for 450,555: refuse to guess.
  if (tail.length === 3 && sep === '.' && dotIsDecimal) return null
  if (tail.length === 3 && /^\d{1,3}$/.test(head)) return { int: head + tail, frac: '' }
  if (tail.length > maxFraction) return null
  return { int: head, frac: tail }
}

/**
 * "25rb", "1,5jt", "Rp 1.250.000", "35.000", "$450.50" to minor units, or null when it is not a clean amount.
 * Never rounds: a value with a fraction of a minor unit ("1,5" rupiah) is rejected. Negative signs are rejected,
 * because the transaction kind carries the direction.
 */
export function parseMoney(input: string, currency: CurrencyCode = 'IDR'): number | null {
  const text = input.trim().replace(SYMBOL_PREFIX, '').trim()
  const match = NUMBER.exec(text)
  if (!match) return null
  const suffix = match[2] ? SUFFIX[match[2].toLowerCase()] : undefined
  const dec = decimalsOf(currency)
  const split = splitNumber(match[1], suffix ? 3 : dec, dec > 0 && !suffix)
  if (!split) return null

  const scale = 10n ** BigInt(split.frac.length)
  const digits = BigInt(split.int + split.frac)
  const scaled = digits * (suffix ?? 1n) * 10n ** BigInt(dec)
  if (scaled % scale !== 0n) return null
  const minor = scaled / scale
  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null
}

// ---------------------------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------------------------

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const COMPACT_STEPS = [
  { unit: 1_000, suffix: 'rb' },
  { unit: 1_000_000, suffix: 'jt' },
  { unit: 1_000_000_000, suffix: 'M' },
]

export interface FormatOptions {
  /** 1,2 jt and 25 rb instead of the full number. Amounts under 1.000 stay whole. */
  compact?: boolean
  /** "+" for positive and "-" for negative, for signed lists such as income and net. Default: only "-". */
  signed?: boolean
  /** Leave the currency symbol off. */
  bare?: boolean
}

/** "Rp 1.250.000", "US$ 450,00", compact "1,2 jt". Sign goes before the symbol. */
export function formatMoney(amountMinor: number, currency: CurrencyCode = 'IDR', options: FormatOptions = {}): string {
  checked(amountMinor)
  const { decimals, symbol } = CURRENCIES[currency]
  const factor = 10 ** decimals
  const abs = Math.abs(amountMinor)
  let body: string

  if (options.compact && abs >= 1000 * factor) {
    const last = COMPACT_STEPS[COMPACT_STEPS.length - 1]
    let picked = ''
    for (const step of COMPACT_STEPS) {
      const u = step.unit * factor
      const tenths = Math.floor((abs * 10 + u / 2) / u)
      // Rounding can reach 1.000 of this unit, which reads better as 1 of the next one.
      if (tenths < 10_000 || step === last) {
        const whole = Math.floor(tenths / 10)
        const d = tenths % 10
        picked = `${group(String(whole))}${d ? `,${d}` : ''} ${step.suffix}`
        break
      }
    }
    body = picked
  } else {
    const major = Math.floor(abs / factor)
    body = group(String(major))
    if (decimals) body += `,${String(abs % factor).padStart(decimals, '0')}`
  }

  const sign = amountMinor < 0 ? '-' : options.signed && amountMinor > 0 ? '+' : ''
  return `${sign}${options.bare ? '' : `${symbol} `}${body}`
}

// ---------------------------------------------------------------------------------------------
// Convert
// ---------------------------------------------------------------------------------------------

export const RATE_DECIMALS = 6
const RATE_SCALE = 10n ** BigInt(RATE_DECIMALS)

/** The rate as stored: at most 6 decimals. Throws for a rate that is not a positive finite number. */
export function normalizeRate(rate: number): number {
  if (!Number.isFinite(rate) || rate <= 0) throw new MoneyError('Kurs harus lebih dari 0.')
  return Number(rate.toFixed(RATE_DECIMALS))
}

/**
 * `amountMinor` of `from` expressed in `to`, at `rate` = units of `to` per one whole unit of `from`.
 * Integer arithmetic throughout; the half goes up (0,5 rupiah becomes 1).
 */
export function convertMinor(amountMinor: number, from: CurrencyCode, to: CurrencyCode, rate: number): number {
  checked(amountMinor)
  if (from === to) return amountMinor
  const scaledRate = BigInt(normalizeRate(rate).toFixed(RATE_DECIMALS).replace('.', ''))
  const negative = amountMinor < 0
  const n = BigInt(Math.abs(amountMinor)) * scaledRate * 10n ** BigInt(decimalsOf(to))
  const d = 10n ** BigInt(decimalsOf(from)) * RATE_SCALE
  const rounded = (n * 2n + d) / (2n * d)
  const out = Number(rounded)
  return checked(negative ? -out : out)
}

/** The `fx` record to store on a transaction: the normalized rate and the base amount at that moment. */
export function toBase(amountMinor: number, currency: CurrencyCode, rate: number, base: CurrencyCode) {
  const normalized = normalizeRate(rate)
  return { rate: normalized, baseAmountMinor: convertMinor(amountMinor, currency, base, normalized) }
}

/**
 * An exchange rate typed by a person: "16250", "16.250" (grouping), "16250,5", "16,250.5". Null when it is not a
 * positive number. Reads digits, so the result carries no float error beyond the 6 decimals `normalizeRate` keeps.
 */
export function parseRate(input: string): number | null {
  const text = input.trim().replace(/\s+/g, '')
  if (!/^\d[\d.,]*$/.test(text) || /[.,]$/.test(text) || /[.,]{2}/.test(text)) return null
  const dots = text.split('.').length - 1
  const commas = text.split(',').length - 1
  let canonical: string
  if (dots && commas) {
    const dec = text.lastIndexOf('.') > text.lastIndexOf(',') ? '.' : ','
    const [head, tail] = text.split(dec)
    if (tail === undefined || text.split(dec).length !== 2) return null
    canonical = `${head.replace(/[.,]/g, '')}.${tail}`
  } else if (dots + commas > 1) {
    // Repeated separators can only be grouping.
    if (!/^\d{1,3}([.,]\d{3})+$/.test(text)) return null
    canonical = text.replace(/[.,]/g, '')
  } else if (dots + commas === 1) {
    const sep = dots ? '.' : ','
    const [head, tail] = text.split(sep)
    // "16.250" is grouping; "16.25" and "16250,5" are decimals.
    canonical = tail.length === 3 && head.length <= 3 && sep === '.' ? head + tail : `${head}.${tail}`
  } else canonical = text
  const value = Number(canonical)
  return Number.isFinite(value) && value > 0 ? Number(value.toFixed(RATE_DECIMALS)) : null
}
