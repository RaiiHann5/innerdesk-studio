import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { useAnchoredPopover } from '@/lib/useAnchoredPopover'
import { openNewEvent, quickDraft, saveDraft } from './eventActions'
import type { EditorTarget } from './store'

const WIDTH = 288

interface QuickCreatePopoverProps {
  day: Date
  /** Empty cells show the trigger straight away; busy cells reveal it on hover or focus. */
  alwaysVisible: boolean
}

/**
 * Title plus optional time, straight from a month cell: Enter saves, Detail hands the same
 * values to the full editor, Escape cancels.
 */
export function QuickCreatePopover({ day, alwaysVisible }: QuickCreatePopoverProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelId = useId()
  const position = useAnchoredPopover(open, triggerRef, panelRef, WIDTH)
  const heading = fmt(day, 'EEEE, d MMMM yyyy')

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', close)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', close)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    setTitle('')
    setTime('')
    setError(null)
  }

  const save = async () => {
    if (!title.trim()) {
      setError('Tulis judul event dulu.')
      inputRef.current?.focus()
      return
    }
    const draft = quickDraft(day, title, time || undefined)
    const target: EditorTarget = { token: Date.now(), prefill: draft }
    setSaving(true)
    const ok = await saveDraft(target, draft, 'series')
    setSaving(false)
    if (ok) close()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={`Tambah event pada ${heading}`}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'ml-auto grid size-6 shrink-0 place-items-center rounded-chip text-muted transition-opacity duration-fast hover:bg-sunken hover:text-ink',
          'opacity-0 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100',
          alwaysVisible && 'opacity-100',
          open && 'bg-sunken text-ink opacity-100',
        )}
      >
        <Plus size={14} weight="bold" aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-label={`Event baru, ${heading}`}
            style={{ width: WIDTH, left: position?.left ?? 0, top: position?.top ?? 0, visibility: position ? 'visible' : 'hidden' }}
            className="fixed z-50 animate-pop-in rounded-card border bg-surface p-3 shadow-lift"
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              void save()
            }}
          >
            <p className="mb-2 text-xs font-medium text-muted">{heading}</p>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setError(null)
              }}
              aria-label="Judul event"
              aria-invalid={error !== null}
              aria-describedby={error ? `${panelId}-error` : undefined}
              placeholder="Judul event"
              className={controlClass}
            />
            <div className="mt-2">
              <label className="sr-only" htmlFor={`${panelId}-time`}>
                Waktu mulai
              </label>
              <input
                id={`${panelId}-time`}
                type="time"
                step={300}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={cn(controlClass, 'tabular-nums')}
              />
            </div>

            {error && (
              <p id={`${panelId}-error`} role="alert" className="mt-1.5 text-xs font-medium text-status-overdue">
                {error}
              </p>
            )}

            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  openNewEvent(day, quickDraft(day, title, time || undefined))
                  close()
                }}
                disabled={!title.trim()}
              >
                Detail
              </Button>
              <Button variant="primary" onClick={() => void save()} disabled={saving}>
                {saving ? 'Menyimpan' : 'Simpan'}
              </Button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}