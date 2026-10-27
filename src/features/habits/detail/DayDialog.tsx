import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { MOOD_LABEL, MOOD_SWATCH } from '@/features/mood/lib/levels'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { cellState, type LogIndex } from '@/lib/habits'
import { useUiStore } from '@/stores/ui'
import type { Habit, HabitLog, MoodEntry } from '@/types/domain'
import { setHabitNote } from '../habitActions'
import { TodayControl } from '../TodayControl'
import { statusText } from './statusText'

/** Starting points for a note, so a blank box is not the first thing in the way. */
const PROMPTS = ['Yang membantu: ', 'Yang menghalangi: ', 'Setelahnya aku merasa ']
export const NOTE_MAX = 500

interface DayDialogProps {
  open: boolean
  habit: Habit
  /** The day to show. When `pickDate` is set the person can move it. */
  date: string
  pickDate?: boolean
  index: LogIndex
  logs: readonly HabitLog[]
  moods: readonly MoodEntry[]
  today: string
  onDateChange: (date: string) => void
  onClose: () => void
}

export function DayDialog(props: DayDialogProps) {
  return (
    <Dialog open={props.open} onClose={props.onClose} label={`Catatan ${props.habit.name}`} className="mt-[8vh] max-w-lg">
      {props.open && <DayForm {...props} />}
    </Dialog>
  )
}

function DayForm({ habit, date, pickDate, index, logs, moods, today, onDateChange, onClose }: DayDialogProps) {
  const showToast = useUiStore((s) => s.showToast)
  const stored = logs.find((l) => l.habitId === habit.id && l.date === date)?.note ?? ''
  // Typing lives here until it is saved; moving to another day starts from that day's saved text.
  const [draft, setDraft] = useState({ date, text: stored })
  const text = draft.date === date ? draft.text : stored
  const [saving, setSaving] = useState(false)
  const mood = moods.find((m) => m.date === date)
  const state = cellState(habit, index, date, today)
  const dirty = text.trim() !== stored.trim()

  const save = async (value: string) => {
    setSaving(true)
    const ok = await setHabitNote(habit, date, value)
    setSaving(false)
    if (!ok) return
    showToast(value.trim() ? 'Catatan disimpan' : 'Catatan dihapus')
    onClose()
  }

  const addPrompt = (prompt: string) => setDraft({ date, text: text ? `${text.trimEnd()}\n${prompt}` : prompt })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        void save(text)
      }}
    >
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{habit.name}</h2>
          <p className="mt-0.5 text-sm text-muted">{fmt(date, 'EEEE, d MMMM yyyy')}</p>
        </div>

        {pickDate && (
          <Field label="Tanggal" htmlFor="day-date">
            <input
              id="day-date"
              type="date"
              value={date}
              min={habit.startDate}
              max={today}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className={cn(controlClass, 'w-44')}
            />
          </Field>
        )}

        <section aria-label="Status hari ini" className="flex flex-wrap items-center justify-between gap-3 rounded-card border p-3">
          <div>
            <p className="text-xs text-muted">Status</p>
            <p className="font-medium">{statusText(habit, index, date, state)}</p>
          </div>
          {date <= today && <TodayControl habit={habit} index={index} date={date} offLabel="Bukan hari terjadwal" />}
        </section>

        {mood && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <span aria-hidden className={cn('size-3 rounded-full', MOOD_SWATCH[mood.level])} />
            Suasana hati hari itu: {MOOD_LABEL[mood.level]}
          </p>
        )}

        <div className="space-y-1.5">
          <Field label="Catatan" htmlFor="day-note">
            <textarea
              id="day-note"
              rows={4}
              maxLength={NOTE_MAX}
              value={text}
              onChange={(e) => setDraft({ date, text: e.target.value })}
              placeholder="Bagaimana hari itu berjalan? Apa yang membantu atau menghalangi?"
              className={cn(controlClass, 'h-auto resize-none py-1.5 leading-relaxed')}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {PROMPTS.map((prompt) => (
                <Button key={prompt} variant="ghost" onClick={() => addPrompt(prompt)} className="h-7 px-2 text-xs">
                  {prompt.trim().replace(/:$/, '')}
                </Button>
              ))}
            </div>
            <span className="text-xs tabular-nums text-muted" aria-live="polite">
              {text.length}/{NOTE_MAX}
            </span>
          </div>
        </div>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-sunken/50 px-4 py-3">
        <div>
          {stored && (
            <Button variant="ghost" disabled={saving} onClick={() => void save('')} className="text-status-overdue hover:text-status-overdue">
              Hapus catatan
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={onClose}>Tutup</Button>
          <Button type="submit" variant="primary" disabled={saving || !dirty}>
            Simpan catatan
          </Button>
        </div>
      </footer>
    </form>
  )
}
