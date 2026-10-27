import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMonths, addWeeks, endOfWeek, isToday, startOfWeek } from 'date-fns'
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StoreGate } from '@/components/ui/StoreGate'
import { EventCard } from '@/features/calendar/EventCard'
import { MonthView } from '@/features/calendar/MonthView'
import { useCalendarStore } from '@/features/calendar/store'
import { WeekGrid } from '@/features/calendar/WeekGrid'
import { getVisibleRange } from '@/features/calendar/lib/range'
import { expandRecurrence } from '@/features/calendar/lib/recurrence'
import { fmt } from '@/lib/date'
import { useCategoryStore, useEventStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useEventStore, useProjectStore, useCategoryStore, useTaskStore]
type Mode = 'week' | 'month'

function Calendar() {
  const masters = useEventStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const navigate = useNavigate()
  const openDay = useCallback(
    (date: Date) => {
      useCalendarStore.setState({ view: 'day' })
      useCalendarStore.getState().setFocusedDate(date)
      navigate('/calendar')
    },
    [navigate],
  )
  const [mode, setMode] = useState<Mode>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  // The old grids take plain events, so repeats are expanded here. All-day events wait for the new views.
  const events = useMemo(() => {
    const range = getVisibleRange(mode, anchor)
    return expandRecurrence(masters, range)
      .filter((o) => !o.event.allDay)
      .map((o) => ({ ...o.event, id: o.instanceKey, start: o.start.toISOString(), end: o.end.toISOString() }))
  }, [masters, mode, anchor])
  const today = useMemo(() => {
    const range = getVisibleRange('day', new Date())
    return expandRecurrence(masters, range)
      .filter((o) => !o.event.allDay)
      .map((o) => ({ ...o.event, id: o.instanceKey, start: o.start.toISOString(), end: o.end.toISOString() }))
  }, [masters])

  const step = (dir: 1 | -1) => setAnchor((a) => (mode === 'week' ? addWeeks(a, dir) : addMonths(a, dir)))
  const title =
    mode === 'month'
      ? fmt(anchor, 'MMMM yyyy')
      : `${fmt(startOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM')} sampai ${fmt(endOfWeek(anchor, { weekStartsOn: 1 }), 'd MMM yyyy')}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <IconButton icon={CaretLeft} label={mode === 'week' ? 'Minggu sebelumnya' : 'Bulan sebelumnya'} onClick={() => step(-1)} />
          <IconButton icon={CaretRight} label={mode === 'week' ? 'Minggu berikutnya' : 'Bulan berikutnya'} onClick={() => step(1)} />
          <h2 aria-live="polite" className="ml-2 text-md font-bold tabular-nums">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAnchor(new Date())} disabled={mode === 'week' ? isToday(anchor) : false}>
            Hari ini
          </Button>
          <SegmentedControl
            label="Rentang kalender"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'week', label: 'Minggu' },
              { value: 'month', label: 'Bulan' },
            ]}
          />
        </div>
      </div>

      {mode === 'week' ? <WeekGrid anchor={anchor} events={events} /> : <MonthView focused={anchor} onOpenDay={openDay} />}

      <section aria-label="Acara hari ini" className="space-y-3">
        <h3 className="text-md font-bold">Hari ini</h3>
        {today.length === 0 ? (
          <EmptyState icon={CalendarBlank} title="Tidak ada acara hari ini" description="Jadwal yang kamu tambahkan di Calendar akan muncul di sini." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {today.map((e) => (
              <EventCard key={e.id} event={e} project={e.projectId ? projectById.get(e.projectId) : undefined} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function CalendarView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={3} />}>
      <Calendar />
    </StoreGate>
  )
}
