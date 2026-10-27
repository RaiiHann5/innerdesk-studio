import { useRef, useState, type KeyboardEvent } from 'react'
import { Plus } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { STATUS_LABEL } from '@/lib/labels'
import type { TaskStatus } from '@/types/domain'
import { quickAddTask } from './taskActions'

interface QuickAddProps {
  status: TaskStatus
  projectId?: string
}

/**
 * The bottom of a kanban column. A button that turns into a title field: Enter saves and keeps the field
 * open for the next one, Escape (or leaving it empty) closes it. The dialog is still the way to set
 * anything beyond a title.
 */
export function QuickAdd({ status, projectId }: QuickAddProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [failed, setFailed] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const close = () => {
    setOpen(false)
    setTitle('')
    setFailed(false)
    // The field is about to unmount, so hand focus back to where the person started.
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  const save = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    setTitle('')
    setFailed(false)
    quickAddTask(trimmed, status, projectId).catch(() => {
      setTitle(trimmed)
      setFailed(true)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault()
      save()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
    }
  }

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Tambah task ke kolom ${STATUS_LABEL[status]}`}
        className="flex h-9 items-center justify-center gap-1.5 rounded-control border border-dashed text-sm font-medium text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
      >
        <Plus aria-hidden size={14} />
        Tambah task
      </button>
    )
  }

  return (
    <div className="space-y-1">
      <input
        autoFocus
        value={title}
        onChange={(e) => {
          setTitle(e.target.value)
          setFailed(false)
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (!title.trim() && !failed) setOpen(false)
        }}
        aria-label={`Judul task baru di kolom ${STATUS_LABEL[status]}`}
        aria-invalid={failed}
        aria-describedby={failed ? `quick-add-error-${status}` : `quick-add-hint-${status}`}
        placeholder="Judul task"
        className={controlClass}
      />
      {failed ? (
        <p id={`quick-add-error-${status}`} role="alert" className="px-1 text-xs font-medium text-status-overdue">
          Task gagal dibuat. Tekan Enter untuk mencoba lagi.
        </p>
      ) : (
        <p id={`quick-add-hint-${status}`} className="px-1 text-xs text-muted">
          Enter untuk menyimpan, Esc untuk menutup.
        </p>
      )}
    </div>
  )
}
