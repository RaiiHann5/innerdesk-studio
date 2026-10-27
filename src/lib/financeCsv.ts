import { BASE_CURRENCY } from '@/lib/config'
import { baseAmountOf } from '@/lib/financeSelectors'
import { validateTransaction } from '@/lib/financeValidate'
import { decimalsOf, parseMoney } from '@/lib/money'
import type { Account, FinanceCategory, NewEntity, Project, Transaction } from '@/types/domain'

/** Local only. Nothing here touches the network: a CSV is built from, or read into, plain objects. */

export const CSV_HEADER = ['tanggal', 'jenis', 'nominal', 'mata_uang', 'kurs', 'nilai_idr', 'akun', 'akun_tujuan', 'kategori', 'catatan', 'penerima', 'proyek', 'tag'] as const
const KIND_ID: Record<Transaction['kind'], string> = { expense: 'pengeluaran', income: 'pemasukan', transfer: 'transfer' }

/** 35000 -> "35000", 45000 USD -> "450,00". Digits only, no float. */
export function plainAmount(minor: number, currency: Transaction['currency']): string {
  const d = decimalsOf(currency)
  if (d === 0) return String(minor)
  const s = String(Math.abs(minor)).padStart(d + 1, '0')
  return `${minor < 0 ? '-' : ''}${s.slice(0, -d)},${s.slice(-d)}`
}

/** Quotes a cell when needed, and defuses a leading = + - @ so a spreadsheet never runs it as a formula. */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

interface ExportContext {
  accounts: Account[]
  categories: FinanceCategory[]
  projects: Project[]
}

export function exportTransactionsCsv(txs: Transaction[], ctx: ExportContext): string {
  const account = new Map(ctx.accounts.map((a) => [a.id, a.name]))
  const category = new Map(ctx.categories.map((c) => [c.id, c.name]))
  const project = new Map(ctx.projects.map((p) => [p.id, p.name]))
  const lines = [CSV_HEADER.join(',')]
  for (const tx of [...txs].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))) {
    const base = baseAmountOf(tx)
    lines.push(
      [
        tx.date,
        KIND_ID[tx.kind],
        plainAmount(tx.amountMinor, tx.currency),
        tx.currency,
        tx.fx ? String(tx.fx.rate).replace('.', ',') : '',
        base !== null && tx.currency !== BASE_CURRENCY ? String(base) : '',
        account.get(tx.accountId) ?? '',
        (tx.toAccountId && account.get(tx.toAccountId)) || '',
        (tx.categoryId && category.get(tx.categoryId)) || '',
        tx.note ?? '',
        tx.payee ?? '',
        (tx.projectId && project.get(tx.projectId)) || '',
        tx.tags.join(' '),
      ]
        .map(csvCell)
        .join(','),
    )
  }
  return `${lines.join('\r\n')}\r\n`
}

/** Reads CSV with quotes, doubled quotes, line breaks inside quotes, CRLF, and a comma or semicolon delimiter. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const head = src.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = (head.match(/;/g)?.length ?? 0) > (head.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delimiter) (row.push(cell), (cell = ''))
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  if (cell !== '' || row.length) (row.push(cell), rows.push(row))
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

// ---------------------------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------------------------

export type ImportField = 'date' | 'amount' | 'note' | 'kind' | 'account' | 'category' | 'payee'
export type ImportMapping = Record<ImportField, number | null>

const ALIASES: Record<ImportField, string[]> = {
  date: ['tanggal', 'tgl', 'date'],
  amount: ['nominal', 'jumlah', 'amount', 'debit', 'value'],
  note: ['catatan', 'keterangan', 'deskripsi', 'description', 'note', 'memo'],
  kind: ['jenis', 'tipe', 'type', 'kind'],
  account: ['akun', 'rekening', 'account'],
  category: ['kategori', 'category'],
  payee: ['penerima', 'payee', 'merchant'],
}
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** Guesses a column for each field from the header names. The person can change every one of them. */
export function guessMapping(header: string[]): ImportMapping {
  const names = header.map(norm)
  const find = (field: ImportField) => {
    const i = names.findIndex((n) => ALIASES[field].includes(n))
    return i >= 0 ? i : null
  }
  return { date: find('date'), amount: find('amount'), note: find('note'), kind: find('kind'), account: find('account'), category: find('category'), payee: find('payee') }
}

/** yyyy-MM-dd, or d/M/yyyy, d-M-yyyy, d.M.yyyy (day first). Null when it is not a real calendar date. */
export function parseImportDate(text: string): string | null {
  const t = text.trim()
  let y: number, m: number, d: number
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(t)
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  else if (local) [d, m, y] = [Number(local[1]), Number(local[2]), Number(local[3])]
  else return null
  const probe = new Date(Date.UTC(y, m - 1, d))
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const EXPENSE_WORDS = ['pengeluaran', 'expense', 'keluar', 'debit', 'db']
const INCOME_WORDS = ['pemasukan', 'income', 'masuk', 'kredit', 'credit', 'cr']

export interface ImportOptions {
  accounts: Account[]
  categories: FinanceCategory[]
  existing: Transaction[]
  /** Used when the file has no account column or the cell is empty. */
  defaultAccountId: string
  /** Kind for an amount with no sign and no kind column. */
  unsignedKind: 'expense' | 'income'
}

export interface ImportRow {
  /** Line number in the file, counting the header as line 1. */
  line: number
  draft?: NewEntity<Transaction>
  error?: string
  /** Same date, amount and note as a transaction already saved, or as an earlier row in this file. */
  duplicate: boolean
}

export const duplicateKey = (date: string, amountMinor: number, note?: string) => `${date}|${amountMinor}|${norm(note ?? '')}`

export function buildImportRows(rows: string[][], mapping: ImportMapping, opts: ImportOptions): ImportRow[] {
  const seen = new Set(opts.existing.map((t) => duplicateKey(t.date, t.amountMinor, t.note)))
  const accountByName = new Map(opts.accounts.map((a) => [norm(a.name), a]))
  const cell = (row: string[], field: ImportField) => {
    const i = mapping[field]
    return i === null ? '' : (row[i] ?? '').trim().replace(/^'(?=[=+\-@])/, '')
  }
  return rows.map((row, index): ImportRow => {
    const line = index + 2
    const fail = (error: string): ImportRow => ({ line, error, duplicate: false })

    const date = parseImportDate(cell(row, 'date'))
    if (!date) return fail('Tanggal tidak terbaca. Pakai 2026-10-15 atau 15/10/2026.')

    const accountText = cell(row, 'account')
    const account = accountText ? accountByName.get(norm(accountText)) : opts.accounts.find((a) => a.id === opts.defaultAccountId)
    if (!account) return fail(accountText ? `Akun "${accountText}" tidak dikenal.` : 'Pilih akun bawaan.')
    if (account.currency !== BASE_CURRENCY) return fail(`Akun ${account.currency} belum didukung saat impor. Catat lewat editor supaya kurs tersimpan.`)

    const rawAmount = cell(row, 'amount')
    const negative = /^-/.test(rawAmount) || /^\(.*\)$/.test(rawAmount)
    const amountMinor = parseMoney(rawAmount.replace(/^[-(]+|\)$/g, ''), account.currency)
    if (amountMinor === null || amountMinor <= 0) return fail('Nominal tidak terbaca atau nol.')

    const kindText = norm(cell(row, 'kind'))
    let kind: 'expense' | 'income'
    if (kindText === 'transfer') return fail('Transfer tidak diimpor. Catat lewat editor.')
    if (EXPENSE_WORDS.includes(kindText)) kind = 'expense'
    else if (INCOME_WORDS.includes(kindText)) kind = 'income'
    else if (kindText) return fail(`Jenis "${kindText}" tidak dikenal.`)
    else kind = negative ? 'expense' : opts.unsignedKind

    const categoryText = norm(cell(row, 'category'))
    const category = categoryText ? opts.categories.find((c) => c.kind === kind && !c.archivedAt && norm(c.name) === categoryText) : undefined

    const draft: NewEntity<Transaction> = {
      date,
      kind,
      amountMinor,
      currency: account.currency,
      accountId: account.id,
      categoryId: category?.id,
      note: cell(row, 'note') || undefined,
      payee: cell(row, 'payee') || undefined,
      tags: [],
    }
    const issue = validateTransaction(draft, opts.accounts, opts.categories)[0]
    if (issue) return fail(issue.message)

    const key = duplicateKey(date, amountMinor, draft.note)
    const duplicate = seen.has(key)
    seen.add(key)
    return { line, draft, duplicate }
  })
}
