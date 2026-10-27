import { useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt, isOverdue } from '@/lib/date'
import type { Task } from '@/types/domain'

interface TaskMonthProps {
  tasks: Task[]
  onOpen: (task: Task) => void
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
const VISIBLE = 2

const dueOn = (tasks: Task[], day: Date) => tasks.filter((t) => t.dueDate && isSameDay(parseISO(t.dueDate), day))

function chipTone(task: Task) {
  if (task.status === 'done') return 'text-muted line-through decoration-faint'
  if (task.dueDate && isOverdue(task.dueDate)) return 'font-medium text-status-overdue'
  return 'text-ink'
}

/** Month view of tasks by due date. The list below the grid keeps the view usable on narrow screens. */
export function TaskMonth({ tasks, onOpen }: TaskMonthProps) {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()))
  const [selected, setSelected] = useState(() => new Date())

  const days = eachDayOfInterval({
    start: startOfWeek(anchor, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
  })
  const undated = tasks.filter((t) => !t.dueDate).length
  const selectedTasks = dueOn(tasks, selected)

  const goToday = () => {
    setAnchor(startOfMonth(new Date()))
    setSelected(new Date())
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 aria-live="polite" className="font-ui text-md font-medium capitalize">
          {fmt(anchor, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <Button onClick={goToday}>Hari ini</Button>
          <IconButton icon={CaretLeft} label="Bulan sebelumnya" onClick={() => setAnchor((a) => subMonths(a, 1))} />
          <IconButton icon={CaretRight} label="Bulan berikutnya" onClick={() => setAnchor((a) => addMonths(a, 1))} />
        </div>
      </div>

      <div className="overflow-hidden rounded-card border bg-surface">
        <div className="grid grid-cols-7 border-b text-xs text-muted">
          {WEEKDAYS.map((d) => (
            <p key={d} className="px-2 py-1.5">
              {d}
            </p>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const items = dueOn(tasks, day)
            const inMonth = isSameMonth(day, anchor)
            const isSelected = isSameDay(day, selected)
            return (
              <div key={day.toISOString()} className="min-h-14 border-b border-r p-1.5 md:min-h-24 [&:nth-child(7n)]:border-r-0">
                <button
                  type="button"
                  onClick={() => setSelected(day)}
                  aria-pressed={isSelected}
                  aria-label={`${fmt(day, 'd MMMM yyyy')}, ${items.length} task`}
                  className={cn(
                    'grid h-5 min-w-5 place-items-center rounded-control px-1 text-xs font-medium tabular-nums',
                    isToday(day) ? 'bg-ink text-bg' : inMonth ? 'text-ink' : 'text-faint',
                    isSelected && !isToday(day) && 'bg-sunken',
                  )}
                >
                  {fmt(day, 'd')}
                </button>
                <div className="mt-1 hidden space-y-1 md:block">
                  {items.slice(0, VISIBLE).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onOpen(t)}
                      className={cn('block w-full truncate rounded-control bg-sunken px-1.5 py-0.5 text-left text-xs', chipTone(t))}
                    >
                      {t.title}
                    </button>
                  ))}
                  {items.length > VISIBLE && (
                    <button type="button" onClick={() => setSelected(day)} className="px-1.5 text-xs text-muted hover:text-ink">
                      {items.length - VISIBLE} lagi
                    </button>
                  )}
                </div>
                {items.length > 0 && (
                  <span aria-hidden className="mt-1 block text-xs tabular-nums text-muted md:hidden">
                    {items.length}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <section aria-label={`Tenggat ${fmt(selected, 'd MMMM yyyy')}`} className="rounded-card border bg-surface p-4">
        <h3 className="font-ui text-sm font-medium">Tenggat {fmt(selected, 'EEEE, d MMMM')}</h3>
        {selectedTasks.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Tidak ada task dengan tenggat di hari ini.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {selectedTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onOpen(t)}
                  className={cn('w-full truncate rounded-control px-2 py-1.5 text-left text-sm hover:bg-sunken', chipTone(t))}
                >
                  {t.title}
                </button>
              </li>
            ))}
          </ul>
        )}
        {undated > 0 && <p className="mt-3 text-xs text-muted tabular-nums">{undated} task tanpa tenggat tidak tampil di kalender.</p>}
      </section>
    </div>
  )
}
