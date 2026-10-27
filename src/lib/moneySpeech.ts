import { decimalsOf, formatMoney } from '@/lib/money'
import type { CurrencyCode } from '@/types/domain'

const IDR_STEPS: Array<[number, string]> = [[1e12, 'triliun'], [1e9, 'miliar'], [1e6, 'juta'], [1e3, 'ribu']]
const NAMES: Record<string, string> = { USD: 'dolar Amerika', EUR: 'euro', SGD: 'dolar Singapura', JPY: 'yen' }

/** An amount the way it is said aloud: "35 ribu rupiah", "1 juta 250 ribu rupiah". Pure integer arithmetic. */
export function spokenMoney(amountMinor: number, currency: CurrencyCode = 'IDR'): string {
  const sign = amountMinor < 0 ? 'minus ' : ''
  const n = Math.abs(amountMinor)
  if (currency !== 'IDR' || decimalsOf(currency) !== 0) return `${sign}${formatMoney(n, currency, { bare: true })} ${NAMES[currency] ?? currency}`
  let rest = n
  const parts: string[] = []
  for (const [size, name] of IDR_STEPS) {
    const q = Math.floor(rest / size)
    if (q > 0) parts.push(`${q} ${name}`)
    rest -= q * size
  }
  if (rest > 0 || parts.length === 0) parts.push(String(rest))
  return `${sign}${parts.join(' ')} rupiah`
}
