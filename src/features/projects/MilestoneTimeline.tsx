import { useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp, CalendarX, Plus, Trash } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import { dueLabelInline } from '@/lib/date'
import { addMilestone, milestoneProgress, removeMilestone, renameMilestone, setMilestoneDue, shiftMilestone, toggleMilestone } from '@/lib/milestones'
import { toastWithRetry } from '@/stores/retryToast'
import type { Milestone, Project } from '@/types/domain'
import { saveMilestones } from './projectActions'
import { milestoneOverdue } from './projectUi'

interface MilestoneTimelineProps {
  project: Project
  /** The milestone shown as "Berikutnya", from the same selector the project card uses. */
  nextId?: string
}

/** Milestones as a simple vertical timeline: a rail, a checkbox per step, the date, and a menu to reorder or remove. */
export function MilestoneTimeline({ project, nextId }: MilestoneTimelineProps) {
  const [title, setTitle] = useState('')
  const items = project.milestones
  const { done, total } = milestoneProgress(items)

  const save = (next: Milestone[]) =>
    saveMilestones(project, next).catch(() => toastWithRetry('Milestone belum bisa disimpan.', () => saveMilestones(project, next)))

  const add = () => {
    if (!title.trim()) return
    void save(addMilestone(items, title))
    setTitle('')
  }
  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      add()
    }
  }

  return (
    <section aria-labelledby="milestone-heading" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="milestone-heading" className="text-md font-bold">
          Milestone
        </h3>
        {total > 0 && (
          <span className="text-xs tabular-nums text-muted">
            {done} dari {total} selesai
          </span>
        )}
      </div>

      {total > 0 ? (
        <ol className="relative">
          {items.map((m, index) => (
            <MilestoneRow
              key={m.id}
              milestone={m}
              first={index === 0}
              last={index === total - 1}
              isNext={m.id === nextId}
              onToggle={() => void save(toggleMilestone(items, m.id))}
              onRename={(next) => void save(renameMilestone(items, m.id, next))}
              onDue={(date) => void save(setMilestoneDue(items, m.id, date))}
              onShift={(dir) => void save(shiftMilestone(items, m.id, dir))}
              onRemove={() => void save(removeMilestone(items, m.id))}
            />
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">Belum ada milestone. Tulis tonggak penting di bawah, misalnya "Prototipe disetujui".</p>
      )}

      <div className="flex items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={onAddKey} aria-label="Tambah milestone" placeholder="Tambah milestone, lalu Enter" className={controlClass} />
        <button
          type="button"
          onClick={add}
          disabled={!title.trim()}
          aria-label="Tambahkan milestone"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus aria-hidden />
        </button>
      </div>
    </section>
  )
}

interface RowProps {
  milestone: Milestone
  first: boolean
  last: boolean
  isNext: boolean
  onToggle: () => void
  onRename: (title: string) => void
  onDue: (date: string | undefined) => void
  onShift: (direction: -1 | 1) => void
  onRemove: () => void
}

function MilestoneRow({ milestone, first, last, isNext, onToggle, onRename, onDue, onShift, onRemove }: RowProps) {
  const [pickingDate, setPickingDate] = useState(false)
  const late = milestoneOverdue(milestone)

  const menu: MenuItem[] = [
    ...(!first ? [{ label: 'Naikkan', icon: ArrowUp, onSelect: () => onShift(-1) }] : []),
    ...(!last ? [{ label: 'Turunkan', icon: ArrowDown, onSelect: () => onShift(1) }] : []),
    ...(milestone.dueDate ? [{ label: 'Hapus tanggal', icon: CalendarX, onSelect: () => onDue(undefined) }] : []),
    { label: 'Hapus', icon: Trash, tone: 'danger' as const, onSelect: onRemove },
  ]

  return (
    <li className="relative flex gap-3 pb-3 last:pb-0">
      {/* The rail runs from this step to the next, behind the checkbox column. */}
      {!last && <span aria-hidden className="absolute bottom-0 left-2 top-6 w-px bg-line" />}
      <input
        type="checkbox"
        checked={milestone.done}
        onChange={onToggle}
        aria-label={`Selesai: ${milestone.title}`}
        className="relative z-10 mt-1.5 size-4 shrink-0 accent-[rgb(var(--accent-text))]"
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="min-w-0 flex-1">
          <input
            defaultValue={milestone.title}
            aria-label={`Judul milestone: ${milestone.title}`}
            onBlur={(e) => {
              // A blank title is refused by renameMilestone, so show the name that was kept.
              if (!e.target.value.trim()) e.target.value = milestone.title
              else if (e.target.value.trim() !== milestone.title) onRename(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            className={cn('h-8 w-full min-w-0 rounded-chip bg-transparent px-1 text-base hover:bg-sunken', milestone.done ? 'text-muted line-through decoration-faint' : 'font-medium')}
          />
          {isNext && <span className="block px-1 text-xs text-muted">Berikutnya</span>}
        </div>

        {milestone.dueDate && !pickingDate ? (
          <button
            type="button"
            onClick={() => setPickingDate(true)}
            // The name starts with what is shown on the button, then says what it does.
            aria-label={`${late ? 'Terlambat, ' : ''}${dueLabelInline(milestone.dueDate)}, ubah tanggal ${milestone.title}`}
            className={cn('shrink-0 rounded-chip px-1.5 py-1 text-sm tabular-nums hover:bg-sunken', late ? 'font-medium text-status-overdue' : 'text-muted')}
          >
            {dueLabelInline(milestone.dueDate)}
          </button>
        ) : pickingDate ? (
          <input
            type="date"
            autoFocus
            defaultValue={milestone.dueDate ?? ''}
            aria-label={`Tanggal: ${milestone.title}`}
            onBlur={(e) => {
              setPickingDate(false)
              if (e.target.value !== (milestone.dueDate ?? '')) onDue(e.target.value || undefined)
            }}
            onKeyDown={(e) => e.key === 'Escape' && setPickingDate(false)}
            className={cn(controlClass, 'h-7 w-36 shrink-0 tabular-nums')}
          />
        ) : (
          <button type="button" onClick={() => setPickingDate(true)} className="shrink-0 rounded-chip px-1.5 py-1 text-sm text-muted hover:bg-sunken hover:text-ink">
            Atur tanggal
          </button>
        )}
        <Menu label={`Aksi milestone ${milestone.title}`} items={menu} />
      </div>
    </li>
  )
}
