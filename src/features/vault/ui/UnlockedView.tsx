import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Gear, LockKey, LockKeyOpen } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/ui'
import { isFavorite, itemTitle, type VaultFilter } from '../lib/payload'
import { useVaultPrefs } from '../store/vaultPrefs'
import { useVaultStore } from '../store/vaultStore'
import type { VaultItemKind, VaultItemPayload } from '../types'
import { ItemDetail } from './ItemDetail'
import { ItemForm } from './ItemForm'
import { ItemList } from './ItemList'

type Mode = { type: 'view' } | { type: 'new'; kind: VaultItemKind } | { type: 'edit' }

export function UnlockedView() {
  const { itemId } = useParams()
  const navigate = useNavigate()
  const lock = useVaultStore((s) => s.lock)
  const items = useVaultStore((s) => s.items)
  const itemsStatus = useVaultStore((s) => s.itemsStatus)
  const unreadable = useVaultStore((s) => s.unreadable)
  const loadItems = useVaultStore((s) => s.loadItems)
  const saveItem = useVaultStore((s) => s.saveItem)
  const removeItem = useVaultStore((s) => s.removeItem)
  const undoRemove = useVaultStore((s) => s.undoRemove)
  const showToast = useUiStore((s) => s.showToast)
  const idleMinutes = useVaultPrefs((s) => s.autoLockMinutes)

  const [filter, setFilter] = useState<VaultFilter>({ query: '', kind: 'all' })
  const [mode, setMode] = useState<Mode>({ type: 'view' })
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (itemsStatus === 'idle') void loadItems()
  }, [itemsStatus, loadItems])

  // Switching to another item (or none) always ends an edit in progress.
  useEffect(() => setMode({ type: 'view' }), [itemId])

  const selected = itemId ? items.find((item) => item.id === itemId) : undefined
  const missing = Boolean(itemId) && itemsStatus === 'ready' && !selected
  const showRight = mode.type !== 'view' || Boolean(itemId)

  const toggleFavorite = async () => {
    if (!selected || selected.kind === 'wifi') return
    const { id, createdAt: _c, updatedAt: _u, ...payload } = selected
    await saveItem({ ...payload, favorite: !isFavorite(selected) } as VaultItemPayload, id)
  }

  const remove = async () => {
    if (!selected) return
    setConfirmDelete(false)
    const result = await removeItem(selected.id)
    if (!result.ok) return showToast('Item tidak bisa dihapus.')
    navigate('/vault')
    showToast('Item dihapus', {
      label: 'Urungkan',
      run: () =>
        void undoRemove().then((undone) => {
          if (undone.ok) navigate(`/vault/${undone.id}`)
          else showToast('Tidak bisa mengurungkan.')
        }),
    })
  }

  return (
    <>
      <PageHeader
        title="Vault"
        description={`Terbuka. Terkunci otomatis setelah ${idleMinutes} menit tanpa aktivitas.`}
        actions={
          <>
            <Button onClick={() => navigate('/vault/pengaturan')}>
              <Gear aria-hidden /> Pengaturan
            </Button>
            <Button onClick={() => lock('manual', idleMinutes)}>
              <LockKey aria-hidden /> Kunci sekarang
              <kbd className="rounded-chip bg-sunken px-1.5 text-xs font-medium text-muted">Shift L</kbd>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 md:h-[calc(100dvh-12rem)] md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-label="Daftar item" className={cn('min-h-0 flex-col', showRight ? 'hidden md:flex' : 'flex')}>
          <ItemList
            items={items}
            status={itemsStatus}
            unreadable={unreadable}
            filter={filter}
            onFilter={setFilter}
            selectedId={itemId}
            onNew={() => {
              setMode({ type: 'new', kind: filter.kind === 'all' ? 'login' : filter.kind })
              if (itemId) navigate('/vault')
            }}
            onRetry={() => void loadItems()}
          />
        </section>

        <section aria-label="Detail item" className={cn('min-h-0 overflow-y-auto md:border-l md:pl-6', showRight ? 'block' : 'hidden md:block')}>
          {mode.type === 'new' ? (
            <ItemForm startKind={mode.kind} onCancel={() => setMode({ type: 'view' })} onSaved={(id) => { setMode({ type: 'view' }); navigate(`/vault/${id}`) }} />
          ) : mode.type === 'edit' && selected ? (
            (() => {
              const { id, createdAt: _c, updatedAt: _u, ...payload } = selected
              return <ItemForm key={id} id={id} initial={payload as VaultItemPayload} onCancel={() => setMode({ type: 'view' })} onSaved={() => setMode({ type: 'view' })} />
            })()
          ) : selected ? (
            <ItemDetail
              key={selected.id}
              item={selected}
              onBack={() => navigate('/vault')}
              onEdit={() => setMode({ type: 'edit' })}
              onDelete={() => setConfirmDelete(true)}
              onToggleFavorite={() => void toggleFavorite()}
            />
          ) : missing ? (
            <EmptyState icon={LockKeyOpen} title="Item tidak ditemukan" description="Item ini sudah dihapus atau tidak ada di vault ini." action={<Button onClick={() => navigate('/vault')}>Kembali ke daftar</Button>} />
          ) : (
            <div className="hidden md:block">
              <EmptyState icon={LockKeyOpen} title="Pilih item" description="Pilih item di daftar untuk melihat isinya, atau buat item baru." />
            </div>
          )}
        </section>
      </div>

      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} label="Hapus item" className="max-w-sm">
        <div className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Hapus item ini?</h2>
            <p className="mt-1 text-sm text-muted">{selected ? `"${itemTitle(selected)}" akan dihapus dari vault.` : ''} Kamu bisa mengurungkannya beberapa detik sesudahnya, sebelum vault terkunci.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={() => void remove()}>
              Hapus
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
