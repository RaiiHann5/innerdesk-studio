import { useDraggable } from '@dnd-kit/core'
import { ArrowRight, DotsSixVertical, Tray, Trash } from '@phosphor-icons/react'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import type { Idea, IdeaCluster } from '@/types/domain'
import { StarButton } from './StarButton'
import { shorten } from './lib/sessions'

interface IdeaChipProps {
  idea: Idea
  /** Every cluster, so the menu can offer each one as a place to move to. */
  clusters: IdeaCluster[]
  onMove: (clusterId: string | undefined) => void
  onStar: () => void
  onDelete: () => void
}

/**
 * An idea on the cluster board. Only the grip is draggable, so the text stays selectable and the star and menu keep
 * their clicks. The menu does everything dragging does, which is what keyboard and touch users rely on.
 */
export function IdeaChip({ idea, clusters, onMove, onStar, onDelete }: IdeaChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: idea.id })

  const items: MenuItem[] = [
    ...(idea.clusterId ? [{ label: 'Lepas dari kelompok', icon: Tray, onSelect: () => onMove(undefined) }] : []),
    ...clusters.filter((c) => c.id !== idea.clusterId).map((c) => ({ label: `Pindah ke ${shorten(c.name, 20)}`, icon: ArrowRight, onSelect: () => onMove(c.id) })),
    { label: 'Hapus ide', icon: Trash, tone: 'danger' as const, onSelect: onDelete },
  ]

  return (
    <li ref={setNodeRef} className={cn('flex items-start gap-0.5 rounded-control border bg-surface py-1.5 pl-0.5 pr-1', isDragging && 'opacity-40')}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Seret ide: ${idea.text}`}
        className="flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-chip text-faint transition-colors duration-fast hover:bg-sunken hover:text-ink active:cursor-grabbing"
      >
        <DotsSixVertical size={16} aria-hidden />
      </button>
      <p className="min-w-0 flex-1 self-center break-words py-0.5 text-base">{idea.text}</p>
      <StarButton starred={idea.starred} onToggle={onStar} />
      <Menu label={`Aksi untuk ide: ${idea.text}`} items={items} />
    </li>
  )
}
