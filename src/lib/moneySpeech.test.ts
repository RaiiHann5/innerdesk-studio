import { describe, expect, it } from 'vitest'
import { spokenMoney } from './moneySpeech'

describe('spokenMoney', () => {
  it('says rupiah in thousands and millions', () => {
    expect(spokenMoney(35_000)).toBe('35 ribu rupiah')
    expect(spokenMoney(1_250_000)).toBe('1 juta 250 ribu rupiah')
    expect(spokenMoney(8_000_000)).toBe('8 juta rupiah')
    expect(spokenMoney(2_500_350)).toBe('2 juta 500 ribu 350 rupiah')
    expect(spokenMoney(0)).toBe('0 rupiah')
    expect(spokenMoney(350)).toBe('350 rupiah')
  })
  it('handles negatives and other currencies', () => {
    expect(spokenMoney(-50_000)).toBe('minus 50 ribu rupiah')
    expect(spokenMoney(45_000, 'USD')).toBe('450,00 dolar Amerika')
  })
})
