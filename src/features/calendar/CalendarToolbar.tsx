import { CaretLeft, CaretRight, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { CategoryFilter } from './CategoryFilter'
import { ShortcutsHelp } from './ShortcutsHelp'
import { ViewMenu } from './ViewMenu'
import type { CalendarView } from './lib/range'

const VIEW_OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: 'day', label: 'Hari' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
]

const UNIT: Record<CalendarView, string> = { day: 'hari', week: 'minggu', month: 'bulan', year: 'tahun' }

interface CalendarToolbarProps {
  view: CalendarView
  title: string
  onViewChange: (view: CalendarView) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onNewEvent: () => void
  /** Owned by the page so the "?" shortcut can open this from anywhere. */
  help: { open: boolean; onOpenChange: (open: boolean) => void }
}

/**
 * The segmented view control fits a desktop and crowds a phone, so below `sm` it becomes a menu.
 * Paging and "hari ini" stay on every size: they are the controls that get used most often.
 */
export function CalendarToolbar({ view, title, onViewChange, onPrev, onNext, onToday, onNewEvent, help }: CalendarToolbarProps) {
  const compact = useMediaQuery('(max-width: 639px)')

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <Button onClick={onToday} className="hidden sm:inline-flex">
          Hari ini
        </Button>
        <div className="flex">
          <IconButton icon={CaretLeft} label={`Sebelumnya, ${UNIT[view]}`} onClick={onPrev} />
          <IconButton icon={CaretRight} label={`Berikutnya, ${UNIT[view]}`} onClick={onNext} />
        </div>
        {/* The page announces the view and this title together, so this heading stays quiet. */}
        <h2 className="min-w-0 truncate text-md font-bold tabular-nums">{title}</h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {compact ? (
          <ViewMenu view={view} onChange={onViewChange} onToday={onToday} />
        ) : (
          <SegmentedControl label="Tampilan kalender" options={VIEW_OPTIONS} value={view} onChange={onViewChange} />
        )}
        <CategoryFilter />
        <ShortcutsHelp view={view} open={help.open} onOpenChange={help.onOpenChange} />
        <Button variant="primary" onClick={onNewEvent}>
          <Plus weight="bold" aria-hidden />
          <span aria-hidden className="hidden sm:inline">
            Event baru
          </span>
          <span className="sr-only sm:hidden">Event baru</span>
        </Button>
      </div>
    </div>
  )
}