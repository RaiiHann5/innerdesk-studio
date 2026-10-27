import { useState, type KeyboardEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/cn'
import { addSubtask, removeSubtask, renameSubtask, shiftSubtask, subtaskProgress, toggleSubtask } from '@/lib/subtasks'
import type { Subtask } from '@/types/domain'

interface SubtaskListProps {
  items: Subtask[]
  onChange: (next: Subtask[]) => void
}

/** The checklist inside a task. Every change hands back the whole list, so the panel saves it as one field. */
export function SubtaskList({ items, onChange }: SubtaskListProps) {
  const [draft, setDraft] = useState('')
  const progress = subtaskProgress(items)

  const add = () => {
    if (!draft.trim()) return
    onChange(addSubtask(items, draft))
    setDraft('')
  }
  const onAddKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      add()
    }
  }

  return (
    <section aria-labelledby="subtask-heading" className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 id="subtask-heading" className="text-sm font-medium">
          Subtask
        </h3>
        {progress && (
          <span className="text-xs tabular-nums text-muted">
            {progress.done} dari {progress.total} selesai
          </span>
        )}
      </div>
      {progress && <ProgressBar label="Subtask selesai" value={Math.round((progress.done / progress.total) * 100)} />}

      {items.length > 0 && (
        <ul className="divide-y rounded-control border">
          {items.map((item, index) => {
            const menu: MenuItem[] = [
              ...(index > 0 ? [{ label: 'Naikkan', icon: ArrowUp, onSelect: () => onChange(shiftSubtask(items, item.id, -1)) }] : []),
              ...(index < items.length - 1 ? [{ label: 'Turunkan', icon: ArrowDown, onSelect: () => onChange(shiftSubtask(items, item.id, 1)) }] : []),
              { label: 'Hapus', icon: Trash, tone: 'danger' as const, onSelect: () => onChange(removeSubtask(items, item.id)) },
            ]
            return (
              <li key={item.id} className="flex items-center gap-2 px-2 py-1">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onChange(toggleSubtask(items, item.id))}
                  aria-label={`Selesai: ${item.title}`}
                  className="size-4 shrink-0 accent-[rgb(var(--accent-text))]"
                />
                <input
                  defaultValue={item.title}
                  aria-label={`Judul subtask ${index + 1}`}
                  onBlur={(e) => {
                    if (e.target.value.trim() !== item.title) onChange(renameSubtask(items, item.id, e.target.value))
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  className={cn('h-8 min-w-0 flex-1 rounded-chip bg-transparent px-1 text-base hover:bg-sunken', item.done && 'text-muted line-through decoration-faint')}
                />
                <Menu label={`Aksi subtask ${item.title}`} items={menu} />
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onAddKey}
          aria-label="Tambah subtask"
          placeholder="Tambah subtask, lalu Enter"
          className={controlClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Tambahkan subtask"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-control border text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus aria-hidden />
        </button>
      </div>
    </section>
  )
}
