import { CalendarBlank, CaretDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Popover } from '@/components/ui/Popover'
import type { CalendarView } from './lib/range'

const OPTIONS: Array<{ value: CalendarView; label: string }> = [
  { value: 'day', label: 'Hari' },
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
]

const LABEL: Record<CalendarView, string> = {
  day: 'Tampilan hari',
  week: 'Tampilan minggu',
  month: 'Tampilan bulan',
  year: 'Tampilan tahun',
}

interface ViewMenuProps {
  view: CalendarView
  onChange: (view: CalendarView) => void
  onToday: () => void
}

/** The phone version of the segmented control: one button that lists the four views. */
export function ViewMenu({ view, onChange, onToday }: ViewMenuProps) {
  return (
    <Popover
      label="Tampilan kalender"
      className="w-44"
      renderTrigger={({ ref, ...props }) => (
        <Button ref={ref} {...props}>
          <CalendarBlank aria-hidden />
          {LABEL[view].replace('Tampilan ', '')}
          <CaretDown aria-hidden />
        </Button>
      )}
    >
      <div className="p-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={option.value === view}
            onClick={() => onChange(option.value)}
            className={option.value === view ? 'flex w-full items-center gap-2 rounded-control bg-accent-soft px-2 py-1.5 text-left text-sm font-medium text-accent-text' : 'flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-sm text-muted hover:bg-sunken hover:text-ink'}
          >
            {option.label}
          </button>
        ))}
        <div className="my-1 border-t" />
        <button
          type="button"
          role="menuitem"
          onClick={onToday}
          className="flex w-full items-center rounded-control px-2 py-1.5 text-left text-sm text-muted hover:bg-sunken hover:text-ink"
        >
          Lompat ke hari ini
        </button>
      </div>
    </Popover>
  )
}