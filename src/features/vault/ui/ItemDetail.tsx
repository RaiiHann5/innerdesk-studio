import { ArrowLeft, PencilSimple, Star, Trash } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Pill } from '@/components/ui/Pill'
import { fmt, isoDay } from '@/lib/date'
import { cn } from '@/lib/cn'
import { KIND_LABELS, daysUntil, isFavorite, itemTitle, monogram, safeHttpUrl } from '../lib/payload'
import type { VaultItem } from '../types'
import { FieldRow, SecretRow, type CopyFn } from './SecretRow'
import { copyStatusText, useCopy } from './useCopy'

interface ItemDetailProps {
  item: VaultItem
  onBack: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
}

export function Monogram({ item, className }: { item: VaultItem; className?: string }) {
  return (
    <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken font-display text-lg font-bold', className)}>
      {monogram(item)}
    </span>
  )
}

function Links({ urls }: { urls: string[] }) {
  if (urls.length === 0) return <span className="text-muted">Kosong</span>
  return (
    <ul className="space-y-1">
      {urls.map((url) => {
        const href = safeHttpUrl(url)
        return (
          <li key={url} className="break-all">
            {href ? (
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent-text underline underline-offset-2">
                {url}
              </a>
            ) : (
              url
            )}
          </li>
        )
      })}
    </ul>
  )
}

function Expiry({ expiresAt }: { expiresAt: string }) {
  const days = daysUntil(expiresAt, isoDay(0))
  const note = days < 0 ? `Sudah kedaluwarsa ${-days} hari lalu` : days === 0 ? 'Kedaluwarsa hari ini' : `${days} hari lagi`
  return (
    <span>
      {fmt(expiresAt, 'd MMM yyyy')} <span className={cn('tabular-nums', days <= 7 ? 'font-medium text-status-overdue' : 'text-muted')}>({note})</span>
    </span>
  )
}

function Body({ item, onCopy }: { item: VaultItem; onCopy: CopyFn }) {
  switch (item.kind) {
    case 'login':
      return (
        <>
          <FieldRow label="Nama pengguna" value={item.username} onCopy={onCopy} />
          <SecretRow label="Kata sandi" value={item.password} onCopy={onCopy} />
          <FieldRow label="Alamat web">
            <Links urls={item.urls} />
          </FieldRow>
          {item.notes && <FieldRow label="Catatan"><span className="whitespace-pre-wrap break-words">{item.notes}</span></FieldRow>}
        </>
      )
    case 'apiKey':
      return (
        <>
          <FieldRow label="Layanan" value={item.service} onCopy={onCopy} />
          <SecretRow label="Kunci API" value={item.key} onCopy={onCopy} />
          {item.expiresAt && (
            <FieldRow label="Kedaluwarsa">
              <Expiry expiresAt={item.expiresAt} />
            </FieldRow>
          )}
          {item.notes && <FieldRow label="Catatan"><span className="whitespace-pre-wrap break-words">{item.notes}</span></FieldRow>}
        </>
      )
    case 'secureNote':
      return <SecretRow label="Isi catatan" value={item.body} onCopy={onCopy} multiline />
    case 'wifi':
      return (
        <>
          <FieldRow label="Nama jaringan" value={item.ssid} onCopy={onCopy} />
          <FieldRow label="Keamanan" value={item.security === 'open' ? 'Terbuka (tanpa sandi)' : item.security} />
          {item.security !== 'open' && <SecretRow label="Kata sandi" value={item.password} onCopy={onCopy} />}
          {item.notes && <FieldRow label="Catatan"><span className="whitespace-pre-wrap break-words">{item.notes}</span></FieldRow>}
        </>
      )
  }
}

export function ItemDetail({ item, onBack, onEdit, onDelete, onToggleFavorite }: ItemDetailProps) {
  const { status, copy } = useCopy()
  const favorite = isFavorite(item)

  return (
    <article aria-label={itemTitle(item)} className="space-y-5">
      <div className="flex items-center gap-3">
        <IconButton icon={ArrowLeft} label="Kembali ke daftar" onClick={onBack} className="md:hidden" />
        <Monogram item={item} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-lg font-bold tracking-tight">{itemTitle(item)}</h2>
          <Pill className="mt-0.5">{KIND_LABELS[item.kind]}</Pill>
        </div>
        {item.kind !== 'wifi' && (
          <IconButton icon={Star} weight={favorite ? 'fill' : 'regular'} label={favorite ? 'Hapus dari favorit' : 'Jadikan favorit'} onClick={onToggleFavorite} className={favorite ? 'text-accent-text' : undefined} />
        )}
        <IconButton icon={PencilSimple} label="Ubah item" onClick={onEdit} />
        <IconButton icon={Trash} label="Hapus item" onClick={onDelete} />
      </div>

      <div className="rounded-card border bg-surface px-4">
        <Body item={item} onCopy={(label, value) => void copy(label, value)} />
      </div>

      {'tags' in item && item.tags.length > 0 && (
        <ul aria-label="Tag" className="flex flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <li key={tag}>
              <Pill>{tag}</Pill>
            </li>
          ))}
        </ul>
      )}

      {item.kind === 'login' && item.passwordHistory.length > 0 && (
        <section aria-labelledby="history-title">
          <h3 id="history-title" className="mb-2 text-sm font-medium">
            Riwayat kata sandi ({item.passwordHistory.length})
          </h3>
          <div className="rounded-card border bg-surface px-4">
            {item.passwordHistory.map((entry, index) => (
              <SecretRow key={`${entry.replacedAt}-${index}`} label={`Diganti ${fmt(entry.replacedAt, 'd MMM yyyy, HH:mm')}`} value={entry.password} onCopy={(_, value) => void copy('Kata sandi lama', value)} />
            ))}
          </div>
        </section>
      )}

      <p role="status" className="min-h-4 text-xs text-muted">
        {status ? copyStatusText(status) : ''}
        {status?.outcome === 'pending' && (
          <span aria-hidden className="ml-2 tabular-nums">
            {status.secondsLeft} dtk
          </span>
        )}
      </p>

      <p className="text-xs tabular-nums text-muted">
        Terakhir diubah {fmt(item.updatedAt, 'd MMM yyyy, HH:mm')} · Dibuat {fmt(item.createdAt, 'd MMM yyyy')}
      </p>
    </article>
  )
}
