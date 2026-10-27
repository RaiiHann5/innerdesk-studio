import { describe, expect, it } from 'vitest'
import { buildImportRows, csvCell, exportTransactionsCsv, guessMapping, parseCsv, parseImportDate, plainAmount } from './financeCsv'
import { makeAccount, makeTx } from './financeTesting'

const bca = makeAccount({ id: 'bca', name: 'BCA' })
const usd = makeAccount({ id: 'paypal', name: 'PayPal', currency: 'USD' })
const ctx = { accounts: [bca, usd], categories: [], projects: [] }

describe('plainAmount', () => {
  it('writes integers without separators and USD with a decimal comma', () => {
    expect(plainAmount(35_000, 'IDR')).toBe('35000')
    expect(plainAmount(45_000, 'USD')).toBe('450,00')
    expect(plainAmount(5, 'USD')).toBe('0,05')
  })
})

describe('csvCell', () => {
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('x\ny')).toBe('"x\ny"')
  })
  it('defuses formulas', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    expect(csvCell('@cmd')).toBe("'@cmd")
  })
})

describe('parseCsv', () => {
  it('handles quotes, a line break inside quotes and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","l1\nl2"\r\n')).toEqual([['a', 'b'], ['x, y', 'l1\nl2']])
  })
  it('detects a semicolon delimiter and strips a BOM', () => {
    expect(parseCsv('\uFEFFtanggal;nominal\n2026-10-01;35000')).toEqual([['tanggal', 'nominal'], ['2026-10-01', '35000']])
  })
})

describe('parseImportDate', () => {
  it('reads ISO and day-first dates and rejects impossible ones', () => {
    expect(parseImportDate('2026-10-05')).toBe('2026-10-05')
    expect(parseImportDate('5/10/2026')).toBe('2026-10-05')
    expect(parseImportDate('31-02-2026')).toBeNull()
    expect(parseImportDate('besok')).toBeNull()
  })
})

describe('export then import', () => {
  it('round-trips and flags every row as a duplicate of what is already saved', () => {
    const txs = [makeTx({ id: '1', kind: 'expense', accountId: 'bca', amountMinor: 35_000, date: '2026-10-05', note: 'makan siang, kantor' })]
    const [header, ...body] = parseCsv(exportTransactionsCsv(txs, ctx))
    const rows = buildImportRows(body, guessMapping(header), { accounts: ctx.accounts, categories: [], existing: txs, defaultAccountId: 'bca', unsignedKind: 'expense' })
    expect(rows[0].draft).toMatchObject({ date: '2026-10-05', kind: 'expense', amountMinor: 35_000, note: 'makan siang, kantor' })
    expect(rows[0].duplicate).toBe(true)
  })
})

describe('buildImportRows', () => {
  const opts = { accounts: [bca, usd], categories: [], existing: [], defaultAccountId: 'bca', unsignedKind: 'expense' as const }
  const map = guessMapping(['Tanggal', 'Keterangan', 'Nominal'])
  it('uses the sign when there is no kind column, and the chosen default when there is none', () => {
    const rows = buildImportRows([['2026-10-01', 'kopi', '-25.000'], ['2026-10-02', 'bonus', '500.000']], map, opts)
    expect(rows.map((r) => r.draft?.kind)).toEqual(['expense', 'expense'])
    expect(buildImportRows([['2026-10-02', 'bonus', '500.000']], map, { ...opts, unsignedKind: 'income' })[0].draft?.kind).toBe('income')
  })
  it('reports errors per row instead of failing the file', () => {
    const rows = buildImportRows([['bukan tanggal', 'x', '1000'], ['2026-10-01', 'x', 'abc'], ['2026-10-01', 'ok', '1000']], map, opts)
    expect(rows.map((r) => Boolean(r.error))).toEqual([true, true, false])
    expect(rows[0].line).toBe(2)
  })
  it('flags a repeated row inside the file, and refuses foreign-currency accounts', () => {
    const rows = buildImportRows([['2026-10-01', 'kopi', '25000'], ['2026-10-01', 'Kopi', '25000']], map, opts)
    expect(rows.map((r) => r.duplicate)).toEqual([false, true])
    const withAccount = guessMapping(['tanggal', 'nominal', 'akun'])
    expect(buildImportRows([['2026-10-01', '100', 'PayPal']], withAccount, opts)[0].error).toMatch(/USD/)
  })
})
