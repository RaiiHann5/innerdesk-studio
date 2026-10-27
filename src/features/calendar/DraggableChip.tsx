import { useDraggable } from '@dnd-kit/core'
import { EventChip } from './EventChip'
import type { Category } from '@/types/domain'
import type { Occurrence } from './lib/recurrence'

interface DraggableChipProps {
  occurrence: Occurrence
  category?: Category
  /** Bars carry edge styling, so the drag wrapper must not disturb the chip's box. */
  edge?: { before: boolean; after: boolean }
  className?: string
  style?: React.CSSProperties
  onOpen?: () => void
}

/**
 * A month chip that can be dragged to another day.
 *
 * dnd-kit supplies the pointer and keyboard behaviour; the drop itself is handled by `MonthView`,
 * which knows how to turn a target date into a reschedule. The chip stays focusable and clickable
 * throughout, so opening the event never depends on the drag.
 */
export function DraggableChip({ occurrence, category, edge, className, style, onOpen }: DraggableChipProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: occurrence.instanceKey })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={isDragging ? 'opacity-40' : undefined}
      style={{ touchAction: 'none' }}
    >
      <EventChip occurrence={occurrence} category={category} edge={edge} onOpen={onOpen} className={className} style={style} />
    </div>
  )
}