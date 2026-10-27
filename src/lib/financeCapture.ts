import { BASE_CURRENCY } from '@/lib/config'
import { toISODate } from '@/lib/date'
import { addDaysIso, isIsoDate } from '@/lib/financeDates'
import { parseMoney } from '@/lib/money'
import type { Account, CurrencyCode, FinanceCategory } from '@/types/domain'

/**
 * One typed line into a draft: "makan siang 35rb kemarin", "gaji 8jt bca", "freelance $100 paypal".
 * Pure and forgiving. It reads what it recognises and leaves the rest as the note, and it never guesses an
 * amount: a line with no clear amount comes back with `amountMinor: null` so the caller can ask for it.
 */
export interface FinanceCapture {
  kind: 'expense' | 'income'
  /** Null when no clear amount was found. */
  amountMinor: number | null
  currency: CurrencyCode
  /** yyyy-MM-dd */
  date: string
  accountId?: string
  categoryId?: string
  note: string
}

interface CaptureContext {
  accounts: Account[]
  categories: FinanceCategory[]
  /** Decides what "hari ini" and "kemarin" mean. */
  now: Date
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const words = (s: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean)

const AMOUNT = /^(?:rp\.?|us\$|\$|usd|s\$|sgd|eur|jpy)?\d[\d.,]*(?:rb|ribu|jt|juta|miliar|k|m)?$/i
const SYMBOL_CURRENCY: [RegExp, CurrencyCode][] = [
  [/^(?:us\$|\$|usd)/i, 'USD'],
  [/^(?:s\$|sgd)/i, 'SGD'],
  [/^eur/i, 'EUR'],
  [/^jpy/i, 'JPY'],
  [/^(?:rp\.?|idr)/i, 'IDR'],
]
const WORD_CURRENCY: Record<string, CurrencyCode> = { dolar: 'USD', usd: 'USD', euro: 'EUR', eur: 'EUR', yen: 'JPY', jpy: 'JPY', sgd: 'SGD', rupiah: 'IDR' }

const INCOME_WORDS = new Set(['gaji', 'honor', 'freelance', 'bonus', 'komisi', 'dividen', 'thr', 'pemasukan', 'pendapatan', 'terima', 'diterima', 'refund', 'cashback', 'hadiah', 'bayaran'])

/** Word in the line -> the category name it usually means. Only used when the person has a category by that name. */
const SYNONYMS: Record<string, string> = {
  makan: 'Makan', kopi: 'Makan', jajan: 'Makan', sarapan: 'Makan', lunch: 'Makan', dinner: 'Makan',
  bensin: 'Transportasi', ojek: 'Transportasi', grab: 'Transportasi', gojek: 'Transportasi', parkir: 'Transportasi', tol: 'Transportasi', krl: 'Transportasi', bus: 'Transportasi',
  listrik: 'Tagihan', pln: 'Tagihan', internet: 'Tagihan', wifi: 'Tagihan', pulsa: 'Tagihan', token: 'Tagihan',
  kos: 'Tempat tinggal', sewa: 'Tempat tinggal', kontrakan: 'Tempat tinggal',
  netflix: 'Hiburan', spotify: 'Hiburan', nonton: 'Hiburan', bioskop: 'Hiburan', game: 'Hiburan',
  belanja: 'Belanja', beli: 'Belanja', shopee: 'Belanja', tokopedia: 'Belanja',
  obat: 'Kesehatan', dokter: 'Kesehatan', apotek: 'Kesehatan', klinik: 'Kesehatan',
  gaji: 'Gaji', freelance: 'Freelance', honor: 'Freelance', bayaran: 'Freelance', proyek: 'Freelance',
  bonus: 'Pemasukan lain', thr: 'Pemasukan lain', hadiah: 'Pemasukan lain', cashback: 'Pemasukan lain', refund: 'Pemasukan lain',
}
/** Words in an account name that say nothing about which account it is. */
const GENERIC = new Set(['utama', 'akun', 'rekening', 'usd', 'idr', 'sgd', 'eur', 'jpy'])


function findDate(text: string, today: string): { date: string; rest: string } {
  const year = today.slice(0, 4)
  const rules: [RegExp, (m: RegExpExecArray) => string | null][] = [
    [/\bkemarin lusa\b/i, () => addDaysIso(today, -2)],
    [/\bhari ini\b/i, () => today],
    [/\bkemarin\b/i, () => addDaysIso(today, -1)],
    [/\btadi\b/i, () => today],
    [/\bbesok\b/i, () => addDaysIso(today, 1)],
    [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => (isIsoDate(m[0]) ? m[0] : null)],
    [
      /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?\b/,
      (m) => {
        const y = m[3] ? (m[3].length === 2 ? `20${m[3]}` : m[3]) : year
        const iso = `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
        return isIsoDate(iso) ? iso : null
      },
    ],
  ]
  for (const [re, build] of rules) {
    const m = re.exec(text)
    if (!m) continue
    const date = build(m)
    if (date) return { date, rest: `${text.slice(0, m.index)} ${text.slice(m.index + m[0].length)}` }
  }
  return { date: today, rest: text }
}

function amountPriority(token: string): number {
  if (/^(?:rp\.?|us\$|\$|usd|s\$|sgd|eur|jpy)/i.test(token) || /(?:rb|ribu|jt|juta|miliar|k|m)$/i.test(token)) return 3
  if (/[.,]/.test(token) || Number(token) >= 1000) return 2
  return 1
}

export function parseFinanceCapture(input: string, { accounts, categories, now }: CaptureContext): FinanceCapture {
  const today = toISODate(now)
  const { date, rest } = findDate(input.replace(/\s+/g, ' ').trim(), today)
  let tokens = rest.split(' ').filter(Boolean)

  // Account: a word of the line equal to a word of the account's name.
  const open = accounts.filter((a) => !a.archivedAt).sort((a, b) => a.order - b.order)
  let account: Account | undefined
  let accountWord = -1
  tokens.forEach((token, i) => {
    if (account) return
    const w = norm(token)
    if (w.length < 3) return
    const hit = open.find((a) => words(a.name).some((n) => n === w && !GENERIC.has(n)))
    if (hit) {
      account = hit
      accountWord = i
    }
  })
  if (accountWord >= 0) tokens = tokens.filter((_, i) => i !== accountWord)

  // Amount: the clearest number-looking token. "2 galon 40rb" reads 40rb, not 2.
  let amountIndex = -1
  let best = 0
  tokens.forEach((token, i) => {
    if (!AMOUNT.test(token)) return
    const p = amountPriority(token)
    if (p >= best) {
      best = p
      amountIndex = i
    }
  })
  const amountToken = amountIndex >= 0 ? tokens[amountIndex] : undefined
  let explicit: CurrencyCode | undefined
  if (amountToken) for (const [re, code] of SYMBOL_CURRENCY) if (re.test(amountToken)) explicit = code
  if (amountIndex >= 0) tokens = tokens.filter((_, i) => i !== amountIndex)
  tokens = tokens.filter((t) => {
    const code = WORD_CURRENCY[norm(t)]
    if (!code) return true
    explicit ??= code
    return false
  })

  const currency = explicit ?? (account as Account | undefined)?.currency ?? BASE_CURRENCY
  const amountMinor = amountToken ? parseMoney(amountToken, currency) : null

  // Kind and category.
  const lowered = tokens.map(norm)
  const hasIncomeWord = lowered.some((w) => INCOME_WORDS.has(w)) || input.trim().startsWith('+')
  const findCategory = (kind: 'income' | 'expense'): FinanceCategory | undefined => {
    const pool = categories.filter((c) => c.kind === kind && !c.archivedAt).sort((a, b) => a.order - b.order)
    for (const w of lowered) {
      if (w.length < 3) continue
      const byName = pool.find((c) => words(c.name).includes(w))
      if (byName) return byName
    }
    for (const w of lowered) {
      const target = SYNONYMS[w]
      const bySynonym = target ? pool.find((c) => norm(c.name) === norm(target)) : undefined
      if (bySynonym) return bySynonym
    }
    return undefined
  }
  let kind: FinanceCapture['kind'] = hasIncomeWord ? 'income' : 'expense'
  let category = findCategory(kind)
  if (!category && kind === 'expense') {
    const income = findCategory('income')
    if (income && lowered.some((w) => SYNONYMS[w] && norm(SYNONYMS[w]) === norm(income.name))) {
      kind = 'income'
      category = income
    }
  }

  const note = tokens.join(' ').replace(/^\+\s*/, '').trim()
  return { kind, amountMinor, currency, date, accountId: account?.id, categoryId: category?.id, note }
}
