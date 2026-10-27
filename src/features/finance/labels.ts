import { fmt } from '@/lib/date'
import { addDaysIso } from '@/lib/financeDates'
import type { AccountKind, TransactionKind } from '@/types/domain'

export const KIND_LABEL: Record<TransactionKind, string> = { expense: 'Pengeluaran', income: 'Pemasukan', transfer: 'Transfer' }
export const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = { tunai: 'Tunai', bank: 'Bank', ewallet: 'E-wallet', investasi: 'Investasi' }

/** "hari ini", "kemarin", otherwise "12 Okt". Lowercase, for use inside a sentence or a chip. */
export function dayWord(date: string, today: string): string {
  if (date === today) return 'hari ini'
  if (date === addDaysIso(today, -1)) return 'kemarin'
  if (date === addDaysIso(today, 1)) return 'besok'
  return fmt(date, 'd MMM')
}

export const monthTitle = (month: string) => fmt(`${month}-01`, 'MMMM yyyy')
