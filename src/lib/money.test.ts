import { describe, expect, it } from 'vitest'
import { MoneyError, add, compare, convertMinor, formatMoney, parseMoney, parseRate, sumMinor, toBase } from './money'

describe('parseMoney', () => {
  it.each([
    ['25rb', 25_000],
    ['25 rb', 25_000],
    ['35k', 35_000],
    ['1,5jt', 1_500_000],
    ['1.5jt', 1_500_000],
    ['8jt', 8_000_000],
    ['1,25jt', 1_250_000],
    ['2 juta', 2_000_000],
    ['1,2 miliar', 1_200_000_000],
    ['Rp 1.250.000', 1_250_000],
    ['Rp1.250.000', 1_250_000],
    ['rp. 35.000', 35_000],
    ['35.000', 35_000],
    ['1.250', 1250],
    ['35000', 35_000],
    ['1.250rb', 1_250_000],
  ])('reads %s as IDR %i', (input, minor) => expect(parseMoney(input, 'IDR')).toBe(minor))

  it.each(['', 'abc', '-5rb', '1,5', '12.5', '1.2.3', '1..000', '1.250.00', '25rb rb', '1,2345jt0'])('rejects %j for IDR', (input) =>
    expect(parseMoney(input, 'IDR')).toBeNull(),
  )

  it('reads USD in minor units, with a dot or a comma as the decimal', () => {
    expect(parseMoney('$450', 'USD')).toBe(45_000)
    expect(parseMoney('450.50', 'USD')).toBe(45_050)
    expect(parseMoney('450,5', 'USD')).toBe(45_050)
    expect(parseMoney('US$ 1,250.75', 'USD')).toBe(125_075)
    expect(parseMoney('1.250,75', 'USD')).toBe(125_075)
    expect(parseMoney('1,250', 'USD')).toBe(125_000)
    expect(parseMoney('450.555', 'USD')).toBeNull()
  })

  it('rejects an amount that is not exact in minor units', () => {
    expect(parseMoney('0,5rb', 'IDR')).toBe(500)
    expect(parseMoney('0,0005jt', 'IDR')).toBeNull()
    expect(parseMoney('0,0004rb', 'IDR')).toBeNull()
  })

  it('rejects values beyond the safe integer range', () => {
    expect(parseMoney('99999999999999999999', 'IDR')).toBeNull()
  })
})

describe('formatMoney', () => {
  it('formats IDR with Indonesian grouping and no decimals', () => {
    expect(formatMoney(1_250_000)).toBe('Rp 1.250.000')
    expect(formatMoney(0)).toBe('Rp 0')
    expect(formatMoney(999)).toBe('Rp 999')
  })
  it('formats USD with two decimals', () => {
    expect(formatMoney(45_000, 'USD')).toBe('US$ 450,00')
    expect(formatMoney(5, 'USD')).toBe('US$ 0,05')
    expect(formatMoney(125_075, 'USD')).toBe('US$ 1.250,75')
  })
  it('puts the sign before the symbol', () => {
    expect(formatMoney(-35_000)).toBe('-Rp 35.000')
    expect(formatMoney(8_000_000, 'IDR', { signed: true })).toBe('+Rp 8.000.000')
    expect(formatMoney(0, 'IDR', { signed: true })).toBe('Rp 0')
    expect(formatMoney(35_000, 'IDR', { bare: true })).toBe('35.000')
  })
  it('compacts to rb, jt and M', () => {
    const c = { compact: true, bare: true }
    expect(formatMoney(25_000, 'IDR', c)).toBe('25 rb')
    expect(formatMoney(1_200_000, 'IDR', c)).toBe('1,2 jt')
    expect(formatMoney(1_250_000, 'IDR', c)).toBe('1,3 jt')
    expect(formatMoney(340_000, 'IDR', c)).toBe('340 rb')
    expect(formatMoney(999_960, 'IDR', c)).toBe('1 jt')
    expect(formatMoney(2_500_000_000, 'IDR', c)).toBe('2,5 M')
    expect(formatMoney(950, 'IDR', c)).toBe('950')
    expect(formatMoney(-1_200_000, 'IDR', { compact: true })).toBe('-Rp 1,2 jt')
  })
})

describe('arithmetic', () => {
  it('adds and compares in one currency and refuses to mix', () => {
    expect(add({ amountMinor: 100, currency: 'USD' }, { amountMinor: 250, currency: 'USD' })).toEqual({ amountMinor: 350, currency: 'USD' })
    expect(compare({ amountMinor: 1, currency: 'IDR' }, { amountMinor: 2, currency: 'IDR' })).toBe(-1)
    expect(() => add({ amountMinor: 1, currency: 'IDR' }, { amountMinor: 1, currency: 'USD' })).toThrow(MoneyError)
  })
  it('is exact where floats are not', () => {
    // 0.1 + 0.2 in cents
    expect(sumMinor([10, 20])).toBe(30)
    expect(sumMinor([])).toBe(0)
  })
  it('refuses a non-integer or an unsafe total', () => {
    expect(() => sumMinor([1.5])).toThrow(MoneyError)
    expect(() => sumMinor([Number.MAX_SAFE_INTEGER, 1])).toThrow(MoneyError)
  })
})

describe('convertMinor', () => {
  it('converts USD cents to rupiah', () => {
    expect(convertMinor(45_000, 'USD', 'IDR', 16_250)).toBe(7_312_500)
    expect(convertMinor(12_345, 'USD', 'IDR', 16_000)).toBe(1_975_200)
  })
  it('rounds the half up', () => {
    // 0.01 USD at 16250.5 is 162.505 rupiah
    expect(convertMinor(1, 'USD', 'IDR', 16_250.5)).toBe(163)
    // 0.01 USD at 16250 is exactly 162.5
    expect(convertMinor(1, 'USD', 'IDR', 16_250)).toBe(163)
    expect(convertMinor(1, 'USD', 'IDR', 16_249.99)).toBe(162)
  })
  it('does not suffer binary float error in the rate', () => {
    expect(convertMinor(100, 'USD', 'IDR', 1.005)).toBe(1)
    expect(convertMinor(100_000, 'USD', 'IDR', 15_999.99)).toBe(15_999_990)
  })
  it('handles currencies with different decimals in both directions', () => {
    expect(convertMinor(1_000, 'JPY', 'IDR', 110.5)).toBe(110_500)
    // A rate keeps 6 decimals: 0.00006 USD per rupiah.
    expect(convertMinor(1_625_000, 'IDR', 'USD', 0.00006)).toBe(9_750)
  })
  it('returns the amount untouched for the same currency and rejects a bad rate', () => {
    expect(convertMinor(1234, 'IDR', 'IDR', 99)).toBe(1234)
    expect(() => convertMinor(1, 'USD', 'IDR', 0)).toThrow(MoneyError)
    expect(() => convertMinor(1, 'USD', 'IDR', Number.NaN)).toThrow(MoneyError)
  })
  it('stores the normalized rate with the base amount', () => {
    expect(toBase(45_000, 'USD', 16_250.1234567, 'IDR')).toEqual({ rate: 16_250.123457, baseAmountMinor: 7_312_556 })
  })
})

describe('parseRate', () => {
  it.each([
    ['16250', 16_250],
    ['16.250', 16_250],
    ['16250,5', 16_250.5],
    ['16250.5', 16_250.5],
    ['16.250,5', 16_250.5],
    ['16,250.5', 16_250.5],
    ['15999.99', 15_999.99],
    ['1.234.567', 1_234_567],
    ['110,5', 110.5],
    [' 16 250 ', 16_250],
  ])('reads %j as %d', (input, value) => expect(parseRate(input)).toBe(value))
  it.each(['', 'abc', '0', '-5', '16..5', '16.250.5', '1,2,3'])('rejects %j', (input) => expect(parseRate(input)).toBeNull())
})
