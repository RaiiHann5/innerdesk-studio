import { isoDay } from '@/lib/date'
import { addDaysIso, dayOfMonth, daysInMonth, monthOf, shiftMonth } from '@/lib/financeDates'
import type { Account, Budget, FinanceCategory, Goal, Recurring, SeedEntity, Transaction } from '@/types/domain'
import { PROJECT_IDS } from './projects'

export const ACCOUNT_IDS = { bca: 'acc-bca', gopay: 'acc-gopay', tunai: 'acc-tunai', paypal: 'acc-paypal' } as const

export const FINANCE_CATEGORY_IDS = {
  makan: 'fcat-makan',
  transport: 'fcat-transport',
  belanja: 'fcat-belanja',
  tagihan: 'fcat-tagihan',
  tinggal: 'fcat-tinggal',
  hiburan: 'fcat-hiburan',
  kesehatan: 'fcat-kesehatan',
  lain: 'fcat-lain',
  gaji: 'fcat-gaji',
  freelance: 'fcat-freelance',
  pemasukanLain: 'fcat-pemasukan-lain',
} as const

const A = ACCOUNT_IDS
const C = FINANCE_CATEGORY_IDS

/**
 * Sample data is placed relative to today (this month and the two before it), so the page never opens on an empty
 * "Bulan ini". Days in the current month are held back to today, so nothing is dated in the future.
 */
const today = () => isoDay(0)
const pad = (n: number) => String(n).padStart(2, '0')
function on(monthOffset: number, day: number): string {
  const month = shiftMonth(monthOf(today()), monthOffset)
  const limit = monthOffset === 0 ? dayOfMonth(today()) : daysInMonth(month)
  return `${month}-${pad(Math.min(day, limit))}`
}
/** The next date with this day of the month, today included. */
function nextOn(day: number): string {
  const month = monthOf(today())
  const here = `${month}-${pad(Math.min(day, daysInMonth(month)))}`
  if (here >= today()) return here
  const next = shiftMonth(month, 1)
  return `${next}-${pad(Math.min(day, daysInMonth(next)))}`
}

export const seedAccounts = (): SeedEntity<Account>[] => [
  { id: A.bca, name: 'BCA utama', kind: 'bank', currency: 'IDR', openingBalanceMinor: 4_500_000, order: 0 },
  { id: A.gopay, name: 'GoPay', kind: 'ewallet', currency: 'IDR', openingBalanceMinor: 250_000, order: 1 },
  { id: A.tunai, name: 'Dompet', kind: 'tunai', currency: 'IDR', openingBalanceMinor: 400_000, order: 2 },
  { id: A.paypal, name: 'PayPal USD', kind: 'ewallet', currency: 'USD', openingBalanceMinor: 0, order: 3 },
]

export const seedFinanceCategories = (): SeedEntity<FinanceCategory>[] => [
  { id: C.makan, name: 'Makan', kind: 'expense', order: 0 },
  { id: C.transport, name: 'Transportasi', kind: 'expense', order: 1 },
  { id: C.belanja, name: 'Belanja', kind: 'expense', order: 2 },
  { id: C.tagihan, name: 'Tagihan', kind: 'expense', order: 3 },
  { id: C.tinggal, name: 'Tempat tinggal', kind: 'expense', order: 4 },
  { id: C.hiburan, name: 'Hiburan', kind: 'expense', order: 5 },
  { id: C.kesehatan, name: 'Kesehatan', kind: 'expense', order: 6 },
  { id: C.lain, name: 'Pengeluaran lain', kind: 'expense', order: 7 },
  { id: C.gaji, name: 'Gaji', kind: 'income', order: 0 },
  { id: C.freelance, name: 'Freelance', kind: 'income', order: 1 },
  { id: C.pemasukanLain, name: 'Pemasukan lain', kind: 'income', order: 2 },
]

type TxSeed = SeedEntity<Transaction>
const spend = (date: string, note: string, amountMinor: number, categoryId: string, accountId: string, extra: Partial<TxSeed> = {}): TxSeed => ({
  date, kind: 'expense', amountMinor, currency: 'IDR', accountId, categoryId, note, tags: [], ...extra,
})

export const seedTransactions = (): SeedEntity<Transaction>[] => [
  // This month
  { date: on(0, 1), kind: 'income', amountMinor: 8_000_000, currency: 'IDR', accountId: A.bca, categoryId: C.gaji, note: 'Gaji bulanan', payee: 'PT Kreasi Digital', tags: ['rutin'] },
  spend(on(0, 3), 'Bayar kos', 2_000_000, C.tinggal, A.bca, { tags: ['rutin'] }),
  spend(on(0, 2), 'Kopi dan sarapan', 38_000, C.makan, A.gopay),
  spend(on(0, 4), 'Isi bensin', 75_000, C.transport, A.tunai),
  spend(on(0, 5), 'Spotify Premium', 54_990, C.hiburan, A.gopay, { tags: ['langganan'] }),
  spend(on(0, 7), 'Makan malam keluarga', 245_000, C.makan, A.bca),
  spend(on(0, 9), 'Token listrik', 200_000, C.tagihan, A.bca, { tags: ['rutin'] }),
  spend(on(0, 12), 'Obat flu', 64_000, C.kesehatan, A.tunai),
  // Last month
  { date: on(-1, 1), kind: 'income', amountMinor: 8_000_000, currency: 'IDR', accountId: A.bca, categoryId: C.gaji, note: 'Gaji bulanan', payee: 'PT Kreasi Digital', tags: ['rutin'] },
  spend(on(-1, 1), 'Bayar kos', 2_000_000, C.tinggal, A.bca, { tags: ['rutin'] }),
  spend(on(-1, 3), 'Spotify Premium', 54_990, C.hiburan, A.gopay, { tags: ['langganan'] }),
  {
    date: on(-1, 5), kind: 'income', amountMinor: 45_000, currency: 'USD', accountId: A.paypal, categoryId: C.freelance,
    note: 'Pembayaran desain situs toko batik', payee: 'Toko Batik Nusantara', projectId: PROJECT_IDS.batik, tags: ['klien'],
    fx: { rate: 16_250, baseAmountMinor: 7_312_500 },
  },
  { date: on(-1, 10), kind: 'transfer', amountMinor: 500_000, currency: 'IDR', accountId: A.bca, toAccountId: A.gopay, note: 'Isi saldo GoPay', tags: [] },
  spend(on(-1, 10), 'Makan malam', 85_000, C.makan, A.gopay),
  { date: on(-1, 12), kind: 'transfer', amountMinor: 30_000, currency: 'USD', accountId: A.paypal, toAccountId: A.bca, toAmountMinor: 4_860_000, note: 'Tarik saldo PayPal', tags: [] },
  spend(on(-1, 15), 'Token listrik', 215_000, C.tagihan, A.bca, { tags: ['rutin'] }),
  spend(on(-1, 18), 'Belanja kebutuhan rumah', 420_000, C.belanja, A.bca),
  spend(on(-1, 22), 'Servis motor', 350_000, C.transport, A.tunai),
  spend(on(-1, 28), 'Makan bersama teman', 190_000, C.makan, A.bca),
  // Two months ago
  { date: on(-2, 1), kind: 'income', amountMinor: 8_000_000, currency: 'IDR', accountId: A.bca, categoryId: C.gaji, note: 'Gaji bulanan', payee: 'PT Kreasi Digital', tags: ['rutin'] },
  spend(on(-2, 1), 'Bayar kos', 2_000_000, C.tinggal, A.bca, { tags: ['rutin'] }),
  spend(on(-2, 3), 'Spotify Premium', 54_990, C.hiburan, A.gopay, { tags: ['langganan'] }),
  { date: on(-2, 12), kind: 'income', amountMinor: 1_500_000, currency: 'IDR', accountId: A.bca, categoryId: C.freelance, note: 'Honor revisi logo', payee: 'Studio Lintas', tags: ['klien'] },
  spend(on(-2, 14), 'Makan di luar', 230_000, C.makan, A.bca),
  spend(on(-2, 20), 'Token listrik', 205_000, C.tagihan, A.bca, { tags: ['rutin'] }),
  spend(on(-2, 25), 'Belanja bulanan', 380_000, C.belanja, A.bca),
]

export const seedBudgets = (): SeedEntity<Budget>[] =>
  [0, -1].flatMap((offset) => {
    const month = shiftMonth(monthOf(today()), offset)
    return [
      { month, categoryId: C.makan, limitMinor: 1_500_000 },
      { month, categoryId: C.transport, limitMinor: 600_000 },
      { month, categoryId: C.belanja, limitMinor: 800_000 },
      { month, categoryId: C.tagihan, limitMinor: 700_000 },
      { month, categoryId: C.hiburan, limitMinor: 300_000 },
    ]
  })

export const seedGoals = (): SeedEntity<Goal>[] => [
  {
    name: 'Dana darurat',
    targetMinor: 30_000_000,
    contributions: [
      { id: 'gc-darurat-1', date: on(-2, 2), amountMinor: 2_000_000, note: 'Sisa gaji' },
      { id: 'gc-darurat-2', date: on(-1, 2), amountMinor: 2_500_000 },
      { id: 'gc-darurat-3', date: on(0, 2), amountMinor: 1_500_000 },
    ],
  },
  {
    name: 'Laptop baru',
    targetMinor: 18_000_000,
    targetDate: addDaysIso(today(), 180),
    contributions: [{ id: 'gc-laptop-1', date: on(-1, 20), amountMinor: 1_000_000, note: 'Honor klien' }],
  },
]

export const seedRecurring = (): SeedEntity<Recurring>[] => [
  { name: 'Listrik', kind: 'expense', amountMinor: 200_000, currency: 'IDR', accountId: A.bca, categoryId: C.tagihan, freq: 'monthly', interval: 1, nextDate: nextOn(20), active: true },
  { name: 'Internet', kind: 'expense', amountMinor: 350_000, currency: 'IDR', accountId: A.bca, categoryId: C.tagihan, freq: 'monthly', interval: 1, nextDate: nextOn(25), active: true },
  { name: 'Spotify Premium', kind: 'expense', amountMinor: 54_990, currency: 'IDR', accountId: A.gopay, categoryId: C.hiburan, freq: 'monthly', interval: 1, nextDate: nextOn(5), active: true },
  { name: 'Bayar kos', kind: 'expense', amountMinor: 2_000_000, currency: 'IDR', accountId: A.bca, categoryId: C.tinggal, freq: 'monthly', interval: 1, nextDate: nextOn(3), active: true },
]
