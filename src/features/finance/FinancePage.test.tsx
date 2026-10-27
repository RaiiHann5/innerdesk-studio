// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubBrowser } from '@/features/projects/testSetup'
import { accountBalances, categoryTotals, monthSummary, netBalance } from '@/lib/financeSelectors'
import { formatMoney } from '@/lib/money'
import { useUiStore } from '@/stores/ui'
import FinancePage from './FinancePage'
import { useAccountStore, useBudgetStore, useFinanceCategoryStore, useGoalStore, useRecurringStore, useTransactionStore } from './store/financeStores'
import { usePrivacyStore } from './store/privacy'

const TODAY = new Date(2026, 9, 15, 10, 0)

function mount(path = '/finance') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FinancePage />
    </MemoryRouter>,
  )
}
const txs = () => useTransactionStore.getState().items
const dialog = (name: string) => screen.getByRole('dialog', { name })

beforeEach(() => {
  stubBrowser()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(TODAY)
  const reset = { items: [], status: 'idle' as const, error: null }
  useAccountStore.setState(reset)
  useFinanceCategoryStore.setState(reset)
  useTransactionStore.setState(reset)
  useBudgetStore.setState(reset)
  useGoalStore.setState(reset)
  useRecurringStore.setState(reset)
  usePrivacyStore.setState({ hidden: false })
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Ringkasan', () => {
  it('shows numbers that come from the shared selectors', async () => {
    mount()
    const region = await screen.findByRole('region', { name: 'Ringkasan bulan' })
    const { accounts, transactions } = { accounts: useAccountStore.getState().items, transactions: txs() }
    const summary = monthSummary(transactions, '2026-10')
    expect(within(region).getByText(formatMoney(summary.incomeMinor, 'IDR', { signed: true }))).toBeTruthy()
    expect(within(region).getByText(formatMoney(summary.expenseMinor))).toBeTruthy()
    expect(within(region).getByText(formatMoney(summary.netMinor, 'IDR', { signed: true }))).toBeTruthy()
    expect(within(region).getByText(`${Math.round(summary.savingsRatePct as number)}%`)).toBeTruthy()

    const net = netBalance(accountBalances(accounts, transactions), transactions)
    const strip = screen.getByRole('region', { name: 'Akun' })
    expect(within(strip).getByText(formatMoney(net.totalMinor))).toBeTruthy()
    // The USD account keeps its own currency; the total is marked as an estimate.
    expect(within(strip).getByText('US$ 150,00')).toBeTruthy()
    expect(within(strip).getByText(/Perkiraan/)).toBeTruthy()
  })

  it('lists the top expense categories with their share written out', async () => {
    mount()
    const bars = await screen.findByRole('region', { name: 'Pengeluaran per kategori' })
    const top = categoryTotals(txs(), '2026-10')[0]
    expect(within(bars).getByText(formatMoney(top.totalMinor))).toBeTruthy()
    expect(within(bars).getByText(`${String(top.sharePct).replace('.', ',')}%`)).toBeTruthy()
  })

  it('gives the chart a text summary and a table', async () => {
    mount()
    const chart = await screen.findByRole('region', { name: 'Arus kas enam bulan' })
    expect(within(chart).getByRole('img').getAttribute('aria-label')).toMatch(/Arus kas 6 bulan/)
    expect(within(chart).getAllByRole('row')).toHaveLength(7)
    expect(within(chart).getByText(/Rata-rata pengeluaran/)).toBeTruthy()
  })

  it('writes three plain insights, saying so when there is too little data', async () => {
    mount('/finance?bulan=2026-03')
    const insights = await screen.findByRole('region', { name: 'Sekilas' })
    expect(within(insights).getAllByText(/belum cukup data/)).toHaveLength(3)
  })

  it('moves between months and back with "Bulan ini"', async () => {
    mount()
    await screen.findByRole('region', { name: 'Ringkasan bulan' })
    fireEvent.click(screen.getByRole('button', { name: 'Bulan sebelumnya' }))
    const switcher = screen.getByRole('group', { name: 'Pilih bulan' })
    expect(within(switcher).getByText('September 2026')).toBeTruthy()
    const september = monthSummary(txs(), '2026-09')
    expect(within(screen.getByRole('region', { name: 'Ringkasan bulan' })).getByText(formatMoney(september.incomeMinor, 'IDR', { signed: true }))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Bulan ini' }))
    expect(within(screen.getByRole('group', { name: 'Pilih bulan' })).getByText('Oktober 2026')).toBeTruthy()
  })
})

describe('privacy', () => {
  it('blurs every amount, says it is not encryption, persists, and has a shortcut', async () => {
    mount()
    const strip = await screen.findByRole('region', { name: 'Akun' })
    const amount = within(strip).getByText('US$ 150,00')
    expect(amount.className).not.toContain('blur')

    fireEvent.click(screen.getByRole('button', { name: 'Sembunyikan nominal' }))
    expect(screen.getByRole('button', { name: 'Sembunyikan nominal' }).getAttribute('aria-pressed')).toBe('true')
    expect(within(strip).getByText('US$ 150,00').className).toContain('blur')
    expect(screen.getByText(/bukan enkripsi/i)).toBeTruthy()
    expect(JSON.parse(localStorage.getItem('pos:finance-privacy') as string).state.hidden).toBe(true)

    fireEvent.keyDown(window, { key: 'H', shiftKey: true })
    expect(usePrivacyStore.getState().hidden).toBe(false)
  })
})

describe('Transaksi', () => {
  it('groups by day with a daily subtotal that leaves transfers out', async () => {
    mount('/finance?tab=transaksi&bulan=2026-09')
    const day = await screen.findByRole('region', { name: /Kamis, 10 September 2026/ })
    // 10 Sep: a transfer to the wallet... and the day's subtotal counts only income and expense.
    const sept10 = txs().filter((t) => t.date === '2026-09-10')
    const expense = sept10.filter((t) => t.kind === 'expense').reduce((n, t) => n + t.amountMinor, 0)
    const income = sept10.filter((t) => t.kind === 'income').reduce((n, t) => n + t.amountMinor, 0)
    if (expense || income) expect(within(day).getAllByText(formatMoney(income - expense, 'IDR', { signed: true })).length).toBeGreaterThan(0)
    expect(within(day).getAllByRole('listitem').length).toBe(sept10.length)
  })

  it('shows income with a plus and an expense plain', async () => {
    mount('/finance?tab=transaksi&bulan=2026-10')
    const salary = (await screen.findByText('Gaji bulanan')).closest('button') as HTMLElement
    expect(within(salary).getByText('+Rp 8.000.000')).toBeTruthy()
    const rent = screen.getByText('Bayar kos').closest('button') as HTMLElement
    expect(within(rent).getByText('Rp 2.000.000')).toBeTruthy()
  })

  it('shows a foreign amount with its rupiah value underneath', async () => {
    mount('/finance?tab=transaksi&bulan=2026-09')
    const row = (await screen.findByText('Pembayaran desain situs toko batik')).closest('button') as HTMLElement
    expect(within(row).getByText('+US$ 450,00')).toBeTruthy()
    expect(within(row).getByText('Rp 7.312.500')).toBeTruthy()
  })

  it('searches and filters, and offers to clear when nothing matches', async () => {
    mount('/finance?tab=transaksi&bulan=2026-10')
    await screen.findByText('Gaji bulanan')
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: 'spotify' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Cari transaksi'), { target: { value: 'tidak ada yang begini' } })
    expect(screen.getByText('Tidak ada transaksi yang cocok')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Hapus filter' }))
    expect(screen.getByText('Gaji bulanan')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    fireEvent.change(screen.getByLabelText('Jenis'), { target: { value: 'income' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(txs().filter((t) => t.kind === 'income' && t.date.startsWith('2026-10')).length)
  })

  it('lets a date range replace the month', async () => {
    mount('/finance?tab=transaksi&bulan=2026-10')
    await screen.findByText('Gaji bulanan')
    fireEvent.click(screen.getByRole('button', { name: /Filter/ }))
    fireEvent.change(screen.getByLabelText('Dari tanggal'), { target: { value: '2026-08-01' } })
    fireEvent.change(screen.getByLabelText('Sampai tanggal'), { target: { value: '2026-08-31' } })
    expect(screen.getByText('Honor revisi logo')).toBeTruthy()
    expect(screen.queryByText('Gaji bulanan')).toBeTruthy() // 1 Aug salary
    expect(screen.getAllByRole('listitem').length).toBe(txs().filter((t) => t.date.startsWith('2026-08')).length)
  })

  it('sorts by amount into a flat list', async () => {
    mount('/finance?tab=transaksi&bulan=2026-10')
    await screen.findByText('Gaji bulanan')
    fireEvent.change(screen.getByLabelText('Urutkan'), { target: { value: 'terbesar' } })
    expect(screen.queryByRole('region', { name: /Oktober 2026/ })).toBeNull()
    expect(within(screen.getAllByRole('listitem')[0]).getByText('Gaji bulanan')).toBeTruthy()
  })

  it('has an empty state with an action for a month with nothing', async () => {
    mount('/finance?tab=transaksi&bulan=2025-01')
    expect(await screen.findByText('Belum ada transaksi bulan ini')).toBeTruthy()
    const buttons = screen.getAllByRole('button', { name: 'Catat transaksi' })
    fireEvent.click(buttons[buttons.length - 1])
    expect(dialog('Catat transaksi')).toBeTruthy()
  })
})

describe('quick add', () => {
  it('previews what it understood and saves on Enter', async () => {
    mount('/finance?tab=transaksi')
    const input = await screen.findByLabelText('Catat cepat')
    fireEvent.change(input, { target: { value: 'makan siang 35rb kemarin' } })
    expect(screen.getByText('Pengeluaran, Makan, 35.000, kemarin')).toBeTruthy()

    const before = txs().length
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => expect(txs()).toHaveLength(before + 1))
    const saved = txs().find((t) => t.note === 'makan siang') as NonNullable<ReturnType<typeof txs>[number]>
    expect(saved).toMatchObject({ amountMinor: 35_000, kind: 'expense', date: '2026-10-14', categoryId: 'fcat-makan', currency: 'IDR' })
    expect((input as HTMLInputElement).value).toBe('')
  })

  it('reads income and an account from "gaji 8jt bca"', async () => {
    mount('/finance?tab=transaksi')
    const input = await screen.findByLabelText('Catat cepat')
    fireEvent.change(input, { target: { value: 'gaji 8jt bca' } })
    expect(screen.getByText('Pemasukan, Gaji, 8.000.000, hari ini, BCA utama')).toBeTruthy()
  })

  it('will not save without an amount, and says why', async () => {
    mount('/finance?tab=transaksi')
    const input = await screen.findByLabelText('Catat cepat')
    fireEvent.change(input, { target: { value: 'makan siang' } })
    const before = txs().length
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getByText('Tulis nominalnya, misalnya 35rb.')).toBeTruthy()
    expect(txs()).toHaveLength(before)
  })

  it('stores a dollar amount with the last rate used and its rupiah value', async () => {
    mount('/finance?tab=transaksi')
    const input = await screen.findByLabelText('Catat cepat')
    fireEvent.change(input, { target: { value: 'freelance $100 paypal' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => expect(txs().some((t) => t.amountMinor === 10_000)).toBe(true))
    expect(txs().find((t) => t.amountMinor === 10_000)).toMatchObject({ currency: 'USD', accountId: 'acc-paypal', kind: 'income', fx: { rate: 16_250, baseAmountMinor: 1_625_000 } })
  })
})

describe('transaction editor', () => {
  const open = async () => {
    mount('/finance?tab=transaksi')
    await screen.findByLabelText('Catat cepat')
    fireEvent.click(screen.getByRole('button', { name: 'Catat transaksi' }))
    return dialog('Catat transaksi')
  }

  it('shows errors inline only after Simpan, and does not save', async () => {
    const panel = await open()
    expect(within(panel).queryByRole('alert')).toBeNull()
    const before = txs().length
    fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }))
    expect(within(panel).getByText('Nominal harus lebih dari 0.')).toBeTruthy()
    expect(within(panel).getByLabelText('Nominal').getAttribute('aria-invalid')).toBe('true')
    expect(txs()).toHaveLength(before)
  })

  it('saves a new expense, closes, and does so on Ctrl+Enter too', async () => {
    const panel = await open()
    fireEvent.change(within(panel).getByLabelText('Nominal'), { target: { value: '1,5jt' } })
    fireEvent.change(within(panel).getByLabelText('Kategori'), { target: { value: 'fcat-belanja' } })
    fireEvent.change(within(panel).getByLabelText('Catatan'), { target: { value: 'Rak buku' } })
    fireEvent.change(within(panel).getByLabelText('Tag'), { target: { value: 'rumah, perabot' } })
    const before = txs().length
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true })
    await waitFor(() => expect(txs()).toHaveLength(before + 1))
    expect(txs().find((t) => t.note === 'Rak buku')).toMatchObject({ amountMinor: 1_500_000, kind: 'expense', categoryId: 'fcat-belanja', tags: ['rumah', 'perabot'], date: '2026-10-15' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Catat transaksi' })).toBeNull())
  })

  it('closes on Escape without saving', async () => {
    await open()
    const before = txs().length
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Catat transaksi' })).toBeNull())
    expect(txs()).toHaveLength(before)
  })

  it('asks for a rate for a dollar account, defaults to the last one, and stores the rupiah value', async () => {
    const panel = await open()
    fireEvent.change(within(panel).getByLabelText('Akun'), { target: { value: 'acc-paypal' } })
    fireEvent.click(within(panel).getByRole('radio', { name: 'Pemasukan' }))
    fireEvent.change(within(panel).getByLabelText('Nominal'), { target: { value: '200' } })
    const rate = within(panel).getByLabelText('Kurs ke IDR') as HTMLInputElement
    expect(rate.value).toBe('16250')
    expect(within(panel).getByText(/Nilai tercatat: Rp 3\.250\.000/)).toBeTruthy()
    fireEvent.change(rate, { target: { value: '16.400' } })
    expect(within(panel).getByText(/Nilai tercatat: Rp 3\.280\.000/)).toBeTruthy()
    fireEvent.change(within(panel).getByLabelText('Catatan'), { target: { value: 'Revisi desain' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(txs().some((t) => t.note === 'Revisi desain')).toBe(true))
    expect(txs().find((t) => t.note === 'Revisi desain')).toMatchObject({ currency: 'USD', amountMinor: 20_000, fx: { rate: 16_400, baseAmountMinor: 3_280_000 } })
  })

  it('needs the received amount for a transfer between currencies, and no category', async () => {
    const panel = await open()
    fireEvent.click(within(panel).getByRole('radio', { name: 'Transfer' }))
    expect(within(panel).queryByLabelText('Kategori')).toBeNull()
    fireEvent.change(within(panel).getByLabelText('Dari akun'), { target: { value: 'acc-paypal' } })
    fireEvent.change(within(panel).getByLabelText('Ke akun'), { target: { value: 'acc-bca' } })
    fireEvent.change(within(panel).getByLabelText('Nominal'), { target: { value: '100' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }))
    expect(within(panel).getByText('Isi jumlah yang diterima akun tujuan.')).toBeTruthy()
    fireEvent.change(within(panel).getByLabelText('Jumlah yang diterima (IDR)'), { target: { value: '1.620.000' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(txs().some((t) => t.toAmountMinor === 1_620_000)).toBe(true))
    const saved = txs().find((t) => t.toAmountMinor === 1_620_000)
    expect(saved).toMatchObject({ kind: 'transfer', accountId: 'acc-paypal', toAccountId: 'acc-bca', amountMinor: 10_000, currency: 'USD' })
    expect(saved?.categoryId).toBeUndefined()
    // Transfers never count: the month's income and expense are unchanged by it.
    expect(monthSummary(txs(), '2026-10').incomeMinor).toBe(8_000_000)
  })

  it('edits an existing transaction and keeps its stored base amount untouched when the rate does not change', async () => {
    mount('/finance?tab=transaksi&bulan=2026-09')
    fireEvent.click((await screen.findByText('Pembayaran desain situs toko batik')).closest('button') as HTMLElement)
    const panel = dialog('Ubah transaksi')
    expect((within(panel).getByLabelText('Nominal') as HTMLInputElement).value).toBe('450,00')
    expect((within(panel).getByLabelText('Kurs ke IDR') as HTMLInputElement).value).toBe('16250')
    fireEvent.change(within(panel).getByLabelText('Catatan'), { target: { value: 'Desain situs batik, termin 1' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Simpan' }))
    await waitFor(() => expect(txs().some((t) => t.note === 'Desain situs batik, termin 1')).toBe(true))
    expect(txs().find((t) => t.note === 'Desain situs batik, termin 1')).toMatchObject({ amountMinor: 45_000, fx: { rate: 16_250, baseAmountMinor: 7_312_500 }, projectId: 'prj-toko-batik' })
  })

  it('deletes after a confirmation and brings it back with Urungkan', async () => {
    mount('/finance?tab=transaksi&bulan=2026-10')
    fireEvent.click((await screen.findByText('Bayar kos')).closest('button') as HTMLElement)
    const panel = dialog('Ubah transaksi')
    const before = txs().length
    fireEvent.click(within(panel).getByRole('button', { name: 'Hapus' }))
    expect(txs()).toHaveLength(before)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Hapus transaksi' })).getByRole('button', { name: 'Hapus' }))
    await waitFor(() => expect(txs()).toHaveLength(before - 1))
    expect(useUiStore.getState().toast?.message).toBe('Transaksi dihapus.')
    await act(async () => useUiStore.getState().toast?.action?.run())
    await waitFor(() => expect(txs()).toHaveLength(before))
    expect(txs().some((t) => t.note === 'Bayar kos' && t.date === '2026-10-03')).toBe(true)
  })
})
