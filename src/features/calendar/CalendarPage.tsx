import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContextPanel } from '@/components/layout/ContextPanel'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useCategoryStore, useEventStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { AgendaPanel } from './AgendaPanel'
import { PageHero } from '@/components/ui/PageHero'
import { CalendarToolbar } from './CalendarToolbar'
import { CategoryLegend } from './CategoryLegend'
import { MiniMonth } from './MiniMonth'
import { MonthSkeleton } from './MonthSkeleton'
import { MonthView } from './MonthView'
import { TimeGrid } from './TimeGrid'
import { TimeGridSkeleton } from './TimeGridSkeleton'
import { YearView } from './YearView'
import { EventEditor } from './editor/EventEditor'
import { openNewEvent, openOccurrence } from './editor/eventActions'
import { useEditorStore } from './editor/store'
import { useCalendarHotkeys } from './hooks/useCalendarHotkeys'
import { useCalendarPanel } from './hooks/useCalendarPanel'
import { useCalendarRange } from './hooks/useCalendarRange'
import { COMPACT_WIDTH, type CalendarView } from './lib/range'
import { useCalendarStore } from './store'

const STORES = [useEventStore, useTaskStore, useCategoryStore, useProjectStore]

const VIEW_ANNOUNCE: Record<CalendarView, string> = {
  day: 'hari',
  week: 'minggu',
  month: 'bulan',
  year: 'tahun',
}

function ViewSkeleton({ view }: { view: CalendarView }) {
  if (view === 'month') return <MonthSkeleton />
  if (view === 'week' || view === 'day') return <TimeGridSkeleton columns={view === 'week' ? 7 : 1} />
  return (
    <div aria-busy="true" aria-label="Memuat kalender" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, i) => (
        <Skeleton key={i} className="h-40 w-full rounded-card" />
      ))}
    </div>
  )
}

function CalendarSkeleton() {
  const view = useCalendarStore((s) => s.view)
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6" aria-busy="true" aria-label="Memuat kalender">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-full max-w-xl" />
      <div className="min-h-0 flex-1"><ViewSkeleton view={view} /></div>
    </div>
  )
}

function Calendar() {
  const { view, focused, range, title, next, prev, today } = useCalendarRange()
  const setView = useCalendarStore((s) => s.setView)
  const setFocusedDate = useCalendarStore((s) => s.setFocusedDate)
  const editing = useEditorStore((s) => s.target !== null)
  const navigate = useNavigate()
  const isCompact = useMediaQuery(COMPACT_WIDTH)
  const { mode, isOpen, setOpen } = useCalendarPanel()
  const [helpOpen, setHelpOpen] = useState(false)

  // A phone has room for one column, so the day view is what it opens on.
  useEffect(() => {
    if (isCompact) setView('day')
  }, [isCompact, setView])

  const openDay = useCallback(
    (date: Date) => {
      setFocusedDate(date)
      setView('day')
    },
    [setFocusedDate, setView],
  )
  const openMonth = useCallback(
    (date: Date) => {
      setFocusedDate(date)
      setView('month')
    },
    [setFocusedDate, setView],
  )
  const newEvent = useCallback(() => openNewEvent(focused), [focused])
  const openTask = useCallback(() => navigate('/tasks'), [navigate])
  useCalendarHotkeys({ next, prev, today, newEvent, help: () => setHelpOpen((v) => !v) })

  // On a phone the month cell shows dots rather than chips, so tapping a day opens its agenda.
  const openDayOrAgenda = useCallback(
    (date: Date) => {
      setFocusedDate(date)
      if (isCompact) setOpen(true)
      else setView('day')
    },
    [isCompact, setFocusedDate, setOpen, setView],
  )

  const panelContent = editing ? (
    <EventEditor />
  ) : (
    <div className="space-y-5">
      <AgendaPanel focused={focused} onOpenTask={openTask} />
      <CategoryLegend />
      <MiniMonth focused={focused} onSelect={setFocusedDate} />
    </div>
  )

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
        <PageHero title="Kalender" description="Event, tenggat task, dan jadwalmu dalam satu tampilan." art="grain" band="top" flip />
        <CalendarToolbar
          view={view}
          title={title}
          onViewChange={setView}
          onPrev={prev}
          onNext={next}
          onToday={today}
          onNewEvent={newEvent}
          help={{ open: helpOpen, onOpenChange: setHelpOpen }}
        />
        <div className="min-h-0 flex-1">
          {view === 'month' && (
            <MonthView focused={focused} onOpenDay={openDayOrAgenda} onOpenEvent={openOccurrence} />
          )}
          {(view === 'week' || view === 'day') && (
            <TimeGrid view={view} range={range} onOpenDay={openDay} onOpenEvent={openOccurrence} />
          )}
          {view === 'year' && <YearView focused={focused} onOpenDay={openDay} onOpenMonth={openMonth} />}
        </div>
      </div>

      {/* The view and the focused date change from the same keystroke, so they are announced together. */}
      <p aria-live="polite" className="sr-only">
        {`Tampilan ${VIEW_ANNOUNCE[view]}. ${title}.`}
      </p>

      {mode === 'column' ? (
        <ContextPanel label={editing ? 'Editor event' : 'Panel kalender'}>{panelContent}</ContextPanel>
      ) : (
        <SheetPanel
          open={isOpen}
          onClose={() => setOpen(false)}
          label={editing ? 'Editor event' : 'Panel kalender'}
          sheet={mode === 'sheet'}
        >
          {panelContent}
        </SheetPanel>
      )}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <StoreGate stores={STORES} skeleton={<CalendarSkeleton />}>
      <Calendar />
    </StoreGate>
  )
}
