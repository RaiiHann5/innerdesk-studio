import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { shiftMonth } from '@/lib/financeDates'
import { monthTitle } from '../labels'

interface MonthSwitcherProps {
  month: string
  currentMonth: string
  onChange: (month: string) => void
}

export function MonthSwitcher({ month, currentMonth, onChange }: MonthSwitcherProps) {
  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Pilih bulan">
      <IconButton icon={CaretLeft} label="Bulan sebelumnya" onClick={() => onChange(shiftMonth(month, -1))} />
      <span className="min-w-28 text-center text-sm font-medium" aria-live="polite">
        {monthTitle(month)}
      </span>
      <IconButton icon={CaretRight} label="Bulan berikutnya" onClick={() => onChange(shiftMonth(month, 1))} />
      {month !== currentMonth && (
        <Button variant="ghost" onClick={() => onChange(currentMonth)}>
          Bulan ini
        </Button>
      )}
    </div>
  )
}
