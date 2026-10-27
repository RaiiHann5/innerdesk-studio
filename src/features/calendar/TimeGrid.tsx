import { useCallback, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { addDays, eachDayOfInterval, isToday, startOfDay } from 'date-fns'
import { fmt, toISODate } from '@/lib/date'
import { AllDayRow } from './AllDayRow'
import { DayColumn } from './DayColumn'
import { DayHeader } from './DayHeader'
import { DayWeather } from './DayWeather'
import { HourGutter, HourLines } from './HourGrid'
import { NowIndicator } from './NowIndicator'
import { useCategories } from './hooks/useCategories'
import { useDayItems } from './hooks/useDayItems'
import { useEventLayout } from './hooks/useEventLayout'
import { minutesToHHMM, useGridDrag, type GridDrag } from './hooks/useGridDrag'
import { openNewEvent } from './editor/eventActions'
import { applyReschedule, rescheduleOf, type Reschedule } from './editor/moveActions'
import { openOccurrence } from './editor/eventActions'
import { RecurringPrompt } from './editor/RecurringPrompt'
import { withPreview, type GridRect } from './lib/dragGeometry'
import type { DateRange, Occurrence } from './lib/recurrence'
import { DEFAULT_SCROLL_MINUTES, GUTTER_PX, HOURS_PER_DAY, HOUR_HEIGHT, minutesToPx, timezoneLabel } from './lib/timeGeometry'

interface TimeGridProps {
  /** Week is seven columns, day is one wide column. */
  view: 'week' | 'day'
  /** Memoized by the caller: the visible days. */
  range: DateRange
  onOpenDay: (date: Date) => void
  onOpenEvent: (occurrence: Occurrence) => void
}

/** Hour-by-hour schedule. Headers and the all-day row stay pinned while the hours scroll. */
export function TimeGrid({ view, range, onOpenDay, onOpenEvent }: TimeGridProps) {
  const isWeek = view === 'week'
  const days = useMemo(() => eachDayOfInterval({ start: range.start, end: addDays(range.end, -1) }), [range])
  const items = useDayItems(range)
  const { byId } = useCategories()
  const [allDayExpanded, setAllDayExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinnedRef = useRef<HTMLDivElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const scrolledFor = useRef<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [pendingDrop, setPendingDrop] = useState<{ occurrence: Occurrence; placement: Reschedule } | null>(null)

  const measure = useCallback((): GridRect | null => {
    const area = areaRef.current
    if (!area) return null
    const box = area.getBoundingClientRect()
    return { left: box.left, top: box.top, width: box.width, height: box.height, days: days.length }
  }, [days.length])

  const onDrop = useCallback(
    (drag: GridDrag, moved: boolean) => {
      // A block lifted and dropped without moving is a click: open it rather than rewriting it.
      if (!moved && drag.kind !== 'create') {
        openOccurrence(drag.occurrence)
        setAnnouncement(`${drag.occurrence.event.title} dibuka.`)
        return
      }
      const day = days[Math.min(days.length - 1, Math.max(0, drag.slot.dayIndex))]
      if (drag.kind === 'create') {
        openNewEvent(day, {
          startTime: minutesToHHMM(drag.span.startMin),
          endTime: minutesToHHMM(Math.max(drag.span.startMin + 15, drag.span.endMin)),
        })
        setAnnouncement('Editor event baru dibuka.')
        return
      }
      const placement = rescheduleOf(drag.occurrence, { day, startMin: drag.span.startMin, endMin: drag.span.endMin })
      if (drag.occurrence.isRecurring) {
        setPendingDrop({ occurrence: drag.occurrence, placement })
        return
      }
      void applyReschedule(drag.occurrence, placement, 'series')
      setAnnouncement(`${drag.occurrence.event.title} dipindahkan ke ${fmt(day, 'EEEE, d MMMM')} ${minutesToHHMM(drag.span.startMin)}.`)
    },
    [days],
  )

  const onCancel = useCallback(() => setAnnouncement('Pemindahan dibatalkan.'), [])

  const grid = useGridDrag({
    dayCount: () => days.length,
    measure,
    onDrop,
    onCancel,
  })

  // While a drag is in flight the day map carries the preview, so the overlap layout makes room for
  // the block live. The block that lands is therefore already where the layout showed it.
  const liveItems = useMemo(() => {
    if (!grid.drag || grid.drag.kind === 'create') return items
    const day = days[Math.min(days.length - 1, Math.max(0, grid.drag.slot.dayIndex))]
    const base = startOfDay(day).getTime()
    const preview: Occurrence = {
      ...grid.drag.occurrence,
      start: new Date(base + grid.drag.span.startMin * 60_000),
      end: new Date(base + grid.drag.span.endMin * 60_000),
    }
    return withPreview(items, days, grid.drag.occurrence, preview)
  }, [grid.drag, items, days])

  const layout = useEventLayout(days, liveItems)

  const columnsStyle = { gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }
  const containsToday = days.some((d) => isToday(d))
  const zone = useMemo(() => timezoneLabel(), [])

  // Land on the current time when today is in view, otherwise on the start of the day's usual hours.
  // Paging between weeks that do not contain today keeps the scroll position the person chose.
  const scrollKey = containsToday ? `${view}:${toISODate(days[0])}:today` : `${view}:other`
  useLayoutEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || scrolledFor.current === scrollKey) return
    scrolledFor.current = scrollKey
    if (!containsToday) {
      scroller.scrollTop = minutesToPx(DEFAULT_SCROLL_MINUTES)
      return
    }
    const now = new Date()
    const visible = scroller.clientHeight - (pinnedRef.current?.offsetHeight ?? 0)
    scroller.scrollTop = Math.max(0, minutesToPx(now.getHours() * 60 + now.getMinutes()) - visible / 3)
  }, [scrollKey, containsToday])

  const startOnBackground = (e: ReactPointerEvent<HTMLDivElement>, description: string) => {
    if (e.button !== 0) return
    grid.startCreate({ x: e.clientX, y: e.clientY })
    setAnnouncement(`${description} Tekan panah untuk mengatur waktu, Enter untuk membuka editor, Escape untuk batal.`)
  }

  const startMove = (occurrence: Occurrence, offsetMinutes: number) => () => {
    grid.startMove(occurrence, offsetMinutes)
    setAnnouncement(`${occurrence.event.title} diangkat.`)
  }

  const startResize = (occurrence: Occurrence, edge: 'start' | 'end') => () => {
    const midnight = startOfDay(occurrence.start).getTime()
    const startMin = (occurrence.start.getTime() - midnight) / 60_000
    const endMin = Math.max(startMin + 15, (occurrence.end.getTime() - midnight) / 60_000)
    grid.startResize(occurrence, edge, { startMin, endMin })
    setAnnouncement(`Mengubah ${edge === 'start' ? 'waktu mulai' : 'waktu selesai'} ${occurrence.event.title}.`)
  }

  // Enter lifts, arrows step, Enter drops, Escape cancels: the same states as the pointer path.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!grid.drag) return
    if (e.key === 'Enter') {
      e.preventDefault()
      setAnnouncement('Menjatuhkan event.')
      grid.drop()
      return
    }
    if (e.key.startsWith('Arrow')) {
      e.preventDefault()
      grid.nudge(e.key)
    }
  }

  return (
    <section
      aria-label={isWeek ? 'Jadwal minggu' : `Jadwal ${fmt(days[0], 'EEEE, d MMMM yyyy')}`}
      className="flex h-full min-h-[30rem] flex-col overflow-hidden rounded-card border bg-surface"
    >
      <p aria-live="assertive" role="status" className="sr-only">
        {announcement}
      </p>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto" tabIndex={-1} onKeyDown={onKeyDown}>
        <div ref={pinnedRef} className="sticky top-0 z-30 border-b bg-surface">
          <div className="flex">
            <div
              className="shrink-0 px-2 pb-2 pt-3 text-right text-xs tabular-nums text-muted"
              style={{ width: GUTTER_PX }}
              title="Zona waktu"
            >
              {zone}
            </div>
            <div role="row" className="grid min-w-0 flex-1" style={columnsStyle}>
              {days.map((day) => (
                <DayHeader
                  key={toISODate(day)}
                  day={day}
                  onOpen={isWeek ? onOpenDay : undefined}
                  trailing={!isWeek && isToday(day) ? <DayWeather /> : undefined}
                />
              ))}
            </div>
          </div>
          <AllDayRow
            columns={layout.columns}
            bars={layout.allDay}
            categories={byId}
            expanded={allDayExpanded}
            onToggle={() => setAllDayExpanded((v) => !v)}
            onOpenEvent={onOpenEvent}
          />
        </div>

        <div className="relative flex" style={{ height: HOURS_PER_DAY * HOUR_HEIGHT }}>
          <HourGutter />
          <div ref={areaRef} data-grid-area className="relative min-w-0 flex-1">
            <HourLines />
            <div className="absolute inset-0 grid" style={columnsStyle}>
              {layout.columns.map((c) => (
                <DayColumn
                  key={c.key}
                  day={c.day}
                  placed={c.placed}
                  timedTasks={c.timedTasks}
                  isToday={isWeek && isToday(c.day)}
                  categories={byId}
                  onOpenEvent={onOpenEvent}
                  onCreateStart={(e) => startOnBackground(e, 'Membuat event baru.')}
                  onMoveStart={startMove}
                  onResizeStart={startResize}
                  onLift={(occurrence, dayIndex, span) => {
                    grid.lift(occurrence, dayIndex, span)
                    setAnnouncement(`${occurrence.event.title} diangkat.`)
                  }}
                  dayIndex={days.findIndex((d) => toISODate(d) === c.key)}
                  draggingKey={grid.drag && grid.drag.kind !== 'create' ? grid.drag.occurrence.instanceKey : null}
                  preview={previewOn(grid.drag, c.key, days.length)}
                />
              ))}
            </div>
          </div>
          <NowIndicator days={days} />
        </div>
      </div>

      <RecurringPrompt
        open={pendingDrop !== null}
        action="move"
        onChoose={(scope) => {
          if (pendingDrop) void applyReschedule(pendingDrop.occurrence, pendingDrop.placement, scope)
          setPendingDrop(null)
        }}
        onClose={() => setPendingDrop(null)}
      />
    </section>
  )
}

/** The preview only shows on the column it is hovering, so it cannot suggest the wrong day. */
function previewOn(drag: GridDrag | null, columnKey: string, dayCount: number) {
  if (!drag || drag.slot.dayIndex >= dayCount) return null
  const created = drag.kind === 'create'
  return {
    startMin: drag.span.startMin,
    endMin: drag.span.endMin,
    title: created ? 'Event baru' : drag.occurrence.event.title,
    categoryId: created ? null : drag.occurrence.event.categoryId,
    dashed: created,
    label: created ? 'Pratinjau event baru' : 'Pratinjau posisi event',
    columnKey,
  }
}