import { useMemo, useState } from 'react'
import { addDays, eachDayOfInterval, isSameMonth } from 'date-fns'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { EmptyState } from '@/components/ui/EmptyState'
import { CalendarBlank, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { fmt, toISODate } from '@/lib/date'
import { EventChip } from './EventChip'
import { MAX_ROWS, MonthCell } from './MonthCell'
import { useCategories } from './hooks/useCategories'
import { useDayItems } from './hooks/useDayItems'
import { openNewEvent } from './editor/eventActions'
import { applyReschedule, rescheduleOf, type Reschedule } from './editor/moveActions'
import { RecurringPrompt } from './editor/RecurringPrompt'
import { EMPTY_DAY, type DayItems } from './lib/calendarItems'
import { layoutWeekBars } from './lib/monthLayout'
import type { Occurrence } from './lib/recurrence'
import { getVisibleRange } from './lib/range'

interface MonthViewProps {
  focused: Date
  onOpenDay: (date: Date) => void
  /** Opens the editor for a chip. Without it, a chip opens the day instead. */
  onOpenEvent?: (occurrence: Occurrence) => void
}

export function MonthView({ focused, onOpenDay, onOpenEvent }: MonthViewProps) {
  const monthKey = fmt(focused, 'yyyy-MM')
  const range = useMemo(() => getVisibleRange('month', focused), [monthKey])
  const items = useDayItems(range)
  const { byId } = useCategories()
  const todayKey = toISODate(new Date())
  const [dragged, setDragged] = useState<Occurrence | null>(null)
  const [pending, setPending] = useState<{ occurrence: Occurrence; placement: Reschedule } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: dayCoordinates, keyboardCodes: { start: ['Enter'], cancel: ['Escape'], end: ['Enter', ' '] } }),
  )

  const weeks = useMemo(() => {
    const days = eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) })
    return Array.from({ length: 6 }, (_, w) => {
      const weekDays = days.slice(w * 7, w * 7 + 7)
      const weekItems = weekDays.map((d) => items.get(toISODate(d)) ?? EMPTY_DAY)
      return { weekDays, weekItems, bars: layoutWeekBars(weekDays, weekItems, MAX_ROWS) }
    })
  }, [range, items])

  const total = useMemo(
    () => weeks.reduce((sum, w) => sum + w.weekItems.reduce((s, d) => s + d.count, 0), 0),
    [weeks],
  )
  const headers = weeks[0].weekDays

  const onDragStart = (e: DragStartEvent) => {
    const occurrence = findOccurrence(weeks.flatMap((w) => w.weekItems), String(e.active.id))
    setDragged(occurrence)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const occurrence = dragged
    setDragged(null)
    if (!occurrence || !e.over) return
    const key = String(e.over.id)
    if (!key.startsWith('day:')) return
    const target = new Date(`${key.slice(4)}T00:00:00`)
    const moved = rescheduleOf(occurrence, { day: target, startMin: 0, endMin: 0 })
    // An unchanged date is a click, not a drop: let the chip open the event instead.
    const sameDay = toISODate(target) === toISODate(occurrence.start)
    if (sameDay && !occurrence.event.allDay) return
    if (occurrence.isRecurring) {
      setPending({ occurrence, placement: moved })
      return
    }
    void applyReschedule(occurrence, moved, 'series')
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragged(null)}
    >
      <div className="relative flex h-full min-h-[44rem] flex-col rounded-card border bg-surface">
        <div role="grid" aria-label={fmt(focused, 'MMMM yyyy')} aria-rowcount={7} className="flex min-h-0 flex-1 flex-col">
          <div role="row" className="grid grid-cols-7 border-b">
            {headers.map((d) => (
              <span key={d.getDay()} role="columnheader" className="px-2 py-2 text-xs font-medium text-muted">
                {fmt(d, 'EEE')}
              </span>
            ))}
          </div>
          {weeks.map(({ weekDays, weekItems, bars }) => (
            <div
              key={toISODate(weekDays[0])}
              role="row"
              className="relative grid min-h-28 flex-1 grid-cols-7 border-b last:border-b-0"
            >
              {weekDays.map((day, col) => {
                const key = toISODate(day)
                return (
                  <MonthCell
                    key={key}
                    day={day}
                    dayKey={key}
                    inMonth={isSameMonth(day, focused)}
                    isToday={key === todayKey}
                    items={weekItems[col]}
                    barsHere={bars.segments.filter((s) => s.startCol <= col && s.endCol >= col).length}
                    bars={bars.segments.filter((s) => s.startCol === col)}
                    laneCount={bars.laneCount}
                    categories={byId}
                    onOpenDay={onOpenDay}
                    onOpenEvent={onOpenEvent}
                  />
                )
              })}
            </div>
          ))}
        </div>
        {total === 0 && (
          <div className="pointer-events-auto absolute inset-0 z-20 grid place-items-center">
            <div className="rounded-card bg-surface">
              <EmptyState
                icon={CalendarBlank}
                title="Belum ada jadwal bulan ini"
                description="Event dan task bertenggat akan muncul di sini. Kalau ada kategori yang disembunyikan, cek filter."
                action={
                  <Button variant="primary" onClick={() => openNewEvent(focused)}>
                    <Plus weight="bold" aria-hidden />
                    Event baru
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {dragged && (
          <div className="-rotate-1 shadow-lift">
            <EventChip occurrence={dragged} category={byId.get(dragged.event.categoryId)} />
          </div>
        )}
      </DragOverlay>

      <RecurringPrompt
        open={pending !== null}
        action="move"
        onChoose={(scope) => {
          if (pending) void applyReschedule(pending.occurrence, pending.placement, scope)
          setPending(null)
        }}
        onClose={() => setPending(null)}
      />
    </DndContext>
  )
}

/** The drag id is the instance key, which is unique across the whole month. */
function findOccurrence(weekItems: DayItems[], instanceKey: string): Occurrence | null {
  for (const day of weekItems) {
    for (const occurrence of [...day.allDay, ...day.timed]) {
      if (occurrence.instanceKey === instanceKey) return occurrence
    }
  }
  return null
}

/** Arrows jump a whole day cell rather than nudging 25 pixels. */
const dayCoordinates: KeyboardCoordinateGetter = (event, { context: { droppableRects, droppableContainers, collisionRect } }) => {
  if (event.code !== 'ArrowLeft' && event.code !== 'ArrowRight') return undefined
  event.preventDefault()
  if (!collisionRect) return undefined
  const cells = droppableContainers
    .getEnabled()
    .flatMap((c) => {
      const rect = droppableRects.get(c.id)
      return rect ? [{ rect, id: String(c.id) }] : []
    })
    .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left)
  if (cells.length === 0) return undefined
  const centerX = collisionRect.left + collisionRect.width / 2
  const current = cells.findIndex((c) => centerX >= c.rect.left && centerX <= c.rect.right)
  const target = cells[Math.min(cells.length - 1, Math.max(0, current + (event.code === 'ArrowRight' ? 1 : -1)))]
  return { x: target.rect.left + target.rect.width / 2, y: target.rect.top + target.rect.height / 2 }
}