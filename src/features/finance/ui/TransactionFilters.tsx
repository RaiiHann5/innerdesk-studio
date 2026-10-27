import { useState } from 'react'
import { FunnelSimple, MagnifyingGlass } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { NO_FILTERS, activeFilterCount, type TransactionFilters, type TransactionSort } from '@/lib/financeList'
import type { Account, FinanceCategory, Project } from '@/types/domain'
import { KIND_LABEL } from '../labels'

const SORT_LABEL: Record<TransactionSort, string> = { terbaru: 'Terbaru', terlama: 'Terlama', terbesar: 'Nominal terbesar', terkecil: 'Nominal terkecil' }

interface TransactionFiltersProps {
  filters: TransactionFilters
  onChange: (next: TransactionFilters) => void
  sort: TransactionSort
  onSort: (sort: TransactionSort) => void
  accounts: Account[]
  categories: FinanceCategory[]
  projects: Project[]
  tags: string[]
}

/** Search and sort stay in view. The rest sits behind "Filter", with a count of what is set. */
export function TransactionFiltersBar({ filters, onChange, sort, onSort, accounts, categories, projects, tags }: TransactionFiltersProps) {
  const [open, setOpen] = useState(false)
  const set = <K extends keyof TransactionFilters>(key: K, value: TransactionFilters[K]) => onChange({ ...filters, [key]: value })
  const count = activeFilterCount(filters)
  const detail = count - (filters.query.trim() ? 1 : 0)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-48 flex-1">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={filters.query}
            onChange={(e) => set('query', e.target.value)}
            aria-label="Cari transaksi"
            placeholder="Cari catatan, penerima, kategori, akun"
            autoComplete="off"
            className={cn(controlClass, 'pl-8')}
          />
        </div>
        <select aria-label="Urutkan" value={sort} onChange={(e) => onSort(e.target.value as TransactionSort)} className={cn(controlClass, 'w-auto')}>
          {(Object.keys(SORT_LABEL) as TransactionSort[]).map((s) => (
            <option key={s} value={s}>
              {SORT_LABEL[s]}
            </option>
          ))}
        </select>
        <Button aria-expanded={open} aria-controls="tx-filters" onClick={() => setOpen((o) => !o)}>
          <FunnelSimple aria-hidden />
          Filter{detail > 0 && <span className="tabular-nums"> ({detail})</span>}
        </Button>
      </div>
      {open && (
        <div id="tx-filters" className="grid gap-3 rounded-card border bg-surface p-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Jenis" htmlFor="f-kind">
            <select id="f-kind" value={filters.kind} onChange={(e) => set('kind', e.target.value as TransactionFilters['kind'])} className={controlClass}>
              <option value="all">Semua</option>
              {(Object.keys(KIND_LABEL) as Array<keyof typeof KIND_LABEL>).map((k) => (
                <option key={k} value={k}>
                  {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Akun" htmlFor="f-account">
            <select id="f-account" value={filters.accountId} onChange={(e) => set('accountId', e.target.value)} className={controlClass}>
              <option value="">Semua akun</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategori" htmlFor="f-category">
            <select id="f-category" value={filters.categoryId} onChange={(e) => set('categoryId', e.target.value)} className={controlClass}>
              <option value="">Semua kategori</option>
              <option value="none">Tanpa kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Proyek" htmlFor="f-project">
            <select id="f-project" value={filters.projectId} onChange={(e) => set('projectId', e.target.value)} className={controlClass}>
              <option value="">Semua proyek</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tag" htmlFor="f-tag">
            <select id="f-tag" value={filters.tag} onChange={(e) => set('tag', e.target.value)} className={controlClass}>
              <option value="">Semua tag</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Dari tanggal" htmlFor="f-from" hint="Rentang tanggal menggantikan pilihan bulan.">
            <input id="f-from" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} className={controlClass} />
          </Field>
          <Field label="Sampai tanggal" htmlFor="f-to">
            <input id="f-to" type="date" value={filters.to} onChange={(e) => set('to', e.target.value)} className={controlClass} />
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" disabled={count === 0} onClick={() => onChange(NO_FILTERS)}>
              Hapus filter
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
