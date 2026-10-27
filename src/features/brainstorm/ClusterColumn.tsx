import { useState, type ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { PencilSimple, Palette, Trash } from '@phosphor-icons/react'
import { Menu } from '@/components/ui/Menu'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'
import type { IdeaCluster } from '@/types/domain'
import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { InlineEdit } from './InlineEdit'
import { MAX_CLUSTER_NAME_LENGTH } from './lib/ideas'

/** The droppable id of the "Belum dikelompokkan" tray. Cluster ids start with "grp-", so the two never meet. */
export const TRAY_ID = 'tray'

interface ClusterColumnProps {
  /** Absent for the tray. */
  cluster?: IdeaCluster
  count: number
  onRename?: (name: string) => void
  onRecolor?: () => void
  onDelete?: () => void
  children: ReactNode
}

/** One drop target on the board: a cluster, or the tray of ideas that have none yet. */
export function ClusterColumn({ cluster, count, onRename, onRecolor, onDelete, children }: ClusterColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cluster?.id ?? TRAY_ID })
  const [renaming, setRenaming] = useState(false)
  const name = cluster?.name ?? 'Belum dikelompokkan'

  return (
    <section aria-label={name} className="min-w-0 rounded-card border bg-sunken/50">
      <header className={cn('flex min-h-11 items-center gap-2 rounded-t-card border-b px-3 py-1.5', cluster && CATEGORY_STYLE[cluster.color].tint)}>
        {cluster && <span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', CATEGORY_STYLE[cluster.color].bar)} />}
        {renaming && cluster ? (
          <InlineEdit
            value={cluster.name}
            label="Nama kelompok"
            maxLength={MAX_CLUSTER_NAME_LENGTH}
            onSave={(next) => {
              setRenaming(false)
              if (next.trim() && next.trim() !== cluster.name) onRename?.(next)
            }}
            onCancel={() => setRenaming(false)}
            className="h-7 flex-1"
          />
        ) : (
          <h3 className={cn('min-w-0 flex-1 truncate text-base font-semibold', !cluster && 'text-muted')}>{name}</h3>
        )}
        <Pill aria-label={`${count} ide`}>{count}</Pill>
        {cluster && (
          <Menu
            label={`Aksi untuk kelompok ${cluster.name}`}
            items={[
              { label: 'Ganti nama', icon: PencilSimple, onSelect: () => setRenaming(true) },
              { label: 'Ganti warna', icon: Palette, onSelect: () => onRecolor?.() },
              { label: 'Hapus kelompok', icon: Trash, tone: 'danger', onSelect: () => onDelete?.() },
            ]}
          />
        )}
      </header>
      <ul ref={setNodeRef} className={cn('min-h-20 space-y-2 rounded-b-card p-2 transition-colors duration-fast', isOver && 'bg-accent-soft')}>
        {children}
        {count === 0 && (
          <li aria-hidden className="px-2 py-5 text-center text-xs text-faint">
            {cluster ? 'Seret ide ke sini' : 'Semua ide sudah punya kelompok'}
          </li>
        )}
      </ul>
    </section>
  )
}
