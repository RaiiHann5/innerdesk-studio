import { MagnifyingGlass, Plus, Star } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'
import { LockKey } from '@phosphor-icons/react'
import { filterAndSort, isFavorite, itemTitle, type VaultFilter } from '../lib/payload'
import type { ItemsStatus } from '../store/vaultStore'
import type { VaultItem, VaultItemKind } from '../types'
import { Monogram } from './ItemDetail'

const CHIPS: Array<{ value: VaultItemKind | 'all'; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'login', label: 'Login' },
  { value: 'apiKey', label: 'Kunci API' },
  { value: 'secureNote', label: 'Catatan' },
  { value: 'wifi', label: 'Wi-Fi' },
]

function subtitle(item: VaultItem): string {
  switch (item.kind) {
    case 'login':
      return item.username || 'Login'
    case 'apiKey':
      return item.service || 'Kunci API'
    case 'secureNote':
      return 'Catatan aman'
    case 'wifi':
      return `Wi-Fi · ${item.security === 'open' ? 'Terbuka' : item.security}`
  }
}

interface ItemListProps {
  items: VaultItem[]
  status: ItemsStatus
  unreadable: number
  filter: VaultFilter
  onFilter: (filter: VaultFilter) => void
  selectedId: string | undefined
  onNew: () => void
  onRetry: () => void
}

export function ItemList({ items, status, unreadable, filter, onFilter, selectedId, onNew, onRetry }: ItemListProps) {
  const shown = filterAndSort(items, filter)
  const filtering = filter.query.trim() !== '' || filter.kind !== 'all'

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <MagnifyingGlass aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            aria-label="Cari di vault"
            placeholder="Cari judul, pengguna, tag"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            value={filter.query}
            onChange={(e) => onFilter({ ...filter, query: e.target.value })}
            className={cn(controlClass, 'pl-8')}
          />
        </div>
        <Button variant="primary" onClick={onNew}>
          <Plus aria-hidden /> Item baru
        </Button>
      </div>

      <SegmentedControl label="Saring jenis item" value={filter.kind} onChange={(kind) => onFilter({ ...filter, kind })} options={CHIPS} fullWidth />

      {unreadable > 0 && (
        <p className="rounded-control bg-sunken px-3 py-2 text-xs">
          {unreadable} item tersimpan tidak bisa dibaca dan dibiarkan apa adanya. Pulihkan dari backup terenkripsi bila perlu.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {status === 'loading' || status === 'idle' ? (
          <div className="space-y-2" aria-busy="true" aria-label="Membuka item">
            {[0, 1, 2, 3].map((n) => (
              <Skeleton key={n} className="h-14" />
            ))}
          </div>
        ) : status === 'error' ? (
          <ErrorState title="Item tidak bisa dimuat" message="Daftar item terenkripsi tidak bisa dibaca. Tidak ada yang diubah." onRetry={onRetry} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={LockKey}
            title="Vault masih kosong"
            description="Simpan kata sandi, kunci API, catatan rahasia, atau Wi-Fi. Semuanya dienkripsi sebelum disimpan."
            action={
              <Button variant="primary" onClick={onNew}>
                <Plus aria-hidden /> Item baru
              </Button>
            }
          />
        ) : shown.length === 0 ? (
          <EmptyState icon={MagnifyingGlass} title="Tidak ada hasil" description={filtering ? 'Coba kata kunci atau jenis item yang lain.' : 'Belum ada item.'} />
        ) : (
          <>
            <p role="status" className="px-1 pb-2 text-xs tabular-nums text-muted">
              {shown.length} item
            </p>
            <ul className="space-y-1">
              {shown.map((item) => (
                <li key={item.id}>
                  <Link
                    to={`/vault/${item.id}`}
                    aria-current={item.id === selectedId ? 'true' : undefined}
                    className={cn('flex items-center gap-3 rounded-control px-2.5 py-2 transition-colors duration-fast', item.id === selectedId ? 'bg-accent-soft' : 'hover:bg-sunken')}
                  >
                    <Monogram item={item} className="size-9 text-md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-medium">{itemTitle(item)}</span>
                      <span className="block truncate text-sm text-muted">{subtitle(item)}</span>
                    </span>
                    {isFavorite(item) && <Star aria-label="Favorit" weight="fill" className="shrink-0 text-accent-text" />}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
