import { useMemo, useState, type FormEvent } from 'react'
import { Trash, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Field, controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { modKey } from '@/lib/hotkeys'
import { useProjectStore } from '@/stores/entities'
import { notificationsBlocked, requestNotificationPermission } from '@/features/focus/lib/notifications'
import type { ReminderOffset } from '@/types/domain'
import { CATEGORY_STYLE } from '../categories'
import { useCategories } from '../hooks/useCategories'
import { deleteEvent, saveDraft, type EditScope } from './eventActions'
import {
  blankDraft,
  draftFromEvent,
  ensureAllDayEnd,
  isSameDraft,
  moveStart,
  REPEAT_OPTIONS,
  REMINDER_LABEL,
  REMINDER_OPTIONS,
  validate,
  type EventDraft,
} from './eventDraft'
import { isSingleOccurrence, useEditorStore, type EditorTarget } from './store'
import { RecurringPrompt } from './RecurringPrompt'

/** Which of the two questions is waiting: the unsaved-changes guard, or the recurring scope. */
type Pending = 'close' | 'save' | 'delete' | null

export function EventEditor() {
  const target = useEditorStore((s) => s.target)
  if (!target) return null
  return <EventEditorForm key={target.token} target={target} />
}

function EventEditorForm({ target }: { target: EditorTarget }) {
  const { categories } = useCategories()
  const projects = useProjectStore((s) => s.items)
  const close = useEditorStore((s) => s.close)

  const initial = useMemo(() => {
    if (target.event) return draftFromEvent(target.event, target.occurrenceStart)
    const day = target.prefill?.date ? new Date(`${target.prefill.date}T00:00:00`) : new Date()
    return { ...blankDraft(day, categories[0]?.id ?? ''), ...target.prefill }
  }, [target])

  const [draft, setDraft] = useState<EventDraft>(initial)
  const [errors, setErrors] = useState<{ title?: string; time?: string }>({})
  const [saving, setSaving] = useState(false)
  const [pending, setPending] = useState<Pending>(null)
  /** Asked once per editing session, then remembered so a second save does not ask again. */
  const [scope, setScope] = useState<EditScope | null>(null)

  const event = target.event
  const recurring = isSingleOccurrence(target)
  const dirty = !isSameDraft(draft, initial)

  const set = (patch: Partial<EventDraft>) => setDraft((d) => ({ ...d, ...patch }))

  const commit = async (action: Pending, chosen: EditScope) => {
    setSaving(true)
    const ok = action === 'delete' ? await deleteEvent(target, chosen) : await saveDraft(target, draft, chosen)
    setSaving(false)
    if (ok) close()
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const found = validate(draft)
    setErrors(found)
    if (found.title || found.time) return
    if (recurring && !scope) {
      setPending('save')
      return
    }
    await commit('save', scope ?? 'series')
  }

  const destroy = async () => {
    if (recurring && !scope) {
      setPending('delete')
      return
    }
    await commit('delete', scope ?? 'series')
  }

  /** The scope is passed in rather than read from state: the answer arrives after the click. */
  const chooseScope = async (chosen: EditScope, action: Pending) => {
    setScope(chosen)
    setPending(null)
    await commit(action, chosen)
  }

  const requestClose = () => {
    if (saving) return
    if (dirty) {
      setPending('close')
      return
    }
    close()
  }

  const day = new Date(`${draft.date}T00:00:00`)
  const heading = event ? 'Ubah event' : 'Event baru'

  return (
    <form
      onSubmit={submit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          requestClose()
        }
        // Cmd/Ctrl+Enter saves from anywhere in the form, including the description.
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          void submit()
        }
      }}
      noValidate
      className="-mx-4 -mt-4"
      aria-label={heading}
    >
      <div className="space-y-3.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-md font-bold tracking-tight">{heading}</h2>
            <p className="mt-0.5 truncate text-xs text-muted">{fmt(day, 'EEEE, d MMMM yyyy')}</p>
          </div>
          {/* The panel already has a close control when it is a drawer; this one belongs to the inline column. */}
          <IconButton icon={X} label="Tutup editor" onClick={requestClose} className="hidden xl:inline-flex" />
        </div>

        <Field label="Judul" htmlFor="event-title">
          <input
            id="event-title"
            autoFocus
            value={draft.title}
            onChange={(e) => set({ title: e.target.value })}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? 'event-title-error' : undefined}
            placeholder="Misalnya: Review desain portofolio"
            className={controlClass}
          />
        </Field>
        {errors.title && (
          <p id="event-title-error" role="alert" className="-mt-2 text-xs font-medium text-status-overdue">
            {errors.title}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Tanggal" htmlFor="event-date">
            <input
              id="event-date"
              type="date"
              value={draft.date}
              onChange={(e) => set(ensureAllDayEnd({ ...draft, date: e.target.value }))}
              className={cn(controlClass, 'tabular-nums')}
            />
          </Field>
          {draft.allDay ? (
            <Field label="Sampai" htmlFor="event-end-date" hint="Tanggal terakhir, tak termasuk.">
              <input
                id="event-end-date"
                type="date"
                value={draft.endDate}
                min={draft.date}
                onChange={(e) => set({ endDate: e.target.value })}
                aria-invalid={Boolean(errors.time)}
                aria-describedby={errors.time ? 'event-time-error' : undefined}
                className={cn(controlClass, 'tabular-nums')}
              />
            </Field>
          ) : (
            <>
              <Field label="Mulai" htmlFor="event-start">
                <input
                  id="event-start"
                  type="time"
                  step={300}
                  value={draft.startTime}
                  onChange={(e) => set(moveStart(draft, e.target.value))}
                  className={cn(controlClass, 'tabular-nums')}
                />
              </Field>
              <Field label="Selesai" htmlFor="event-end">
                <input
                  id="event-end"
                  type="time"
                  step={300}
                  min={draft.startTime}
                  value={draft.endTime}
                  onChange={(e) => set({ endTime: e.target.value })}
                  aria-invalid={Boolean(errors.time)}
                  aria-describedby={errors.time ? 'event-time-error' : undefined}
                  className={cn(controlClass, 'tabular-nums')}
                />
              </Field>
            </>
          )}
        </div>
        {errors.time && (
          <p id="event-time-error" role="alert" className="-mt-2 text-xs font-medium text-status-overdue">
            {errors.time}
          </p>
        )}

        <Switch
          id="event-all-day"
          label="Sepanjang hari"
          checked={draft.allDay}
          onChange={(allDay) => set(ensureAllDayEnd({ ...draft, allDay }))}
        />

        <Field label="Ulangi" htmlFor="event-repeat">
          <select
            id="event-repeat"
            value={draft.repeat}
            onChange={(e) => set({ repeat: e.target.value as EventDraft['repeat'] })}
            className={controlClass}
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lokasi" htmlFor="event-location">
          <input
            id="event-location"
            value={draft.location}
            onChange={(e) => set({ location: e.target.value })}
            placeholder="Opsional"
            className={controlClass}
          />
        </Field>

        <Field label="Tautan" htmlFor="event-link" hint="Rapat daring, dokumen, atau apa pun yang relevan.">
          <input
            id="event-link"
            type="url"
            value={draft.link}
            onChange={(e) => set({ link: e.target.value })}
            placeholder="https://"
            className={controlClass}
          />
        </Field>

        <Field label="Project" htmlFor="event-project">
          <select id="event-project" value={draft.projectId} onChange={(e) => set({ projectId: e.target.value })} className={controlClass}>
            <option value="">Tanpa project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <fieldset>
          <legend className="text-sm font-medium">Kategori</legend>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {categories.map((category) => {
              const selected = draft.categoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set({ categoryId: category.id })}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-chip border px-2 text-xs font-medium transition-colors duration-fast',
                    selected
                      ? 'border-accent bg-accent-soft text-accent-text'
                      : 'border-line text-muted hover:border-faint hover:text-ink',
                  )}
                >
                  <span aria-hidden className={cn('h-3.5 w-[3px] rounded-full', CATEGORY_STYLE[category.colorToken].bar)} />
                  {category.name}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Pengingat</legend>
          <p className="mt-0.5 text-xs text-muted">
            {notificationsBlocked()
              ? 'Notifikasi diblokir di browser, jadi pengingat tampil di dalam aplikasi. Muncul selama Innerdesk terbuka.'
              : 'Muncul selama Innerdesk terbuka di browser. Acara seharian diingatkan mulai pukul 09.00.'}
          </p>
          <div className="mt-1.5 space-y-0.5">
            {REMINDER_OPTIONS.map((offset) => (
              <label
                key={offset}
                className="flex cursor-pointer items-center gap-2.5 rounded-control px-1 py-1 text-sm hover:bg-sunken"
              >
                <input
                  type="checkbox"
                  checked={draft.reminders.includes(offset)}
                  onChange={(e) => {
                    // Asked here, from a real click, so the browser prompt is tied to turning a reminder on.
                    if (e.target.checked) requestNotificationPermission()
                    set({
                      reminders: e.target.checked
                        ? [...draft.reminders, offset]
                        : draft.reminders.filter((r: ReminderOffset) => r !== offset),
                    })
                  }}
                  className="size-4 accent-accent"
                />
                {REMINDER_LABEL[offset]}
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Deskripsi" htmlFor="event-description">
          <textarea
            id="event-description"
            rows={3}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            className={cn(controlClass, 'h-auto resize-none py-1.5')}
          />
        </Field>
      </div>

      <footer className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t bg-surface px-4 py-3">
        {event ? (
          <Button variant="ghost" onClick={() => void destroy()} disabled={saving} className="text-status-overdue">
            <Trash aria-hidden />
            Hapus
          </Button>
        ) : (
          <span />
        )}
        <span className="flex items-center gap-2">
          <Button onClick={requestClose} disabled={saving}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={saving} title={`${modKey} + Enter`}>
            Simpan
          </Button>
        </span>
      </footer>

      <ConfirmDialog
        open={pending === 'close'}
        label="Perubahan belum disimpan"
        title="Tinggalkan tanpa menyimpan?"
        description="Perubahan pada event ini akan hilang."
        confirmLabel="Ya, tinggalkan"
        onConfirm={close}
        onClose={() => setPending(null)}
      />

      <RecurringPrompt
        open={pending === 'save' || pending === 'delete'}
        action={pending === 'delete' ? 'delete' : 'save'}
        onChoose={(chosen) => void chooseScope(chosen, pending)}
        onClose={() => setPending(null)}
      />
    </form>
  )
}

interface SwitchProps {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}

/** Small pill toggle. Orange marks the on state, the same as every other active control. */
function Switch({ id, label, checked, onChange, hint }: SwitchProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0">
        {/* A label cannot point at a button, so the switch is named by this id instead. */}
        <span id={`${id}-label`} className="text-sm font-medium">
          {label}
        </span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors duration-fast',
          checked ? 'bg-accent' : 'bg-faint',
        )}
      >
        <span
          aria-hidden
          className="absolute top-[3px] size-3.5 rounded-full bg-surface transition-transform duration-fast"
          style={{ transform: `translateX(${checked ? 18 : 3}px)` }}
        />
      </button>
    </div>
  )
}