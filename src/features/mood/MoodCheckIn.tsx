import { useState } from 'react'
import { Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { fmt, isoDay } from '@/lib/date'
import type { MoodEntry, MoodFactor, MoodLevel } from '@/types/domain'
import { FactorChips } from './FactorChips'
import { MoodScale } from './MoodScale'
import { useMoodActions } from './hooks/useMoodActions'

interface MoodCheckInProps {
  /** yyyy-MM-dd. The parent keys this component by date, so a different day starts from that day's entry. */
  date: string
  entry: MoodEntry | undefined
  onBackToToday: () => void
}

const NOTE_MAX = 140

const sameFactors = (a: MoodFactor[], b: MoodFactor[]) => a.length === b.length && a.every((f) => b.includes(f))

export function MoodCheckIn({ date, entry, onBackToToday }: MoodCheckInProps) {
  const { save } = useMoodActions()
  const [level, setLevel] = useState<MoodLevel | null>(entry?.level ?? null)
  const [factors, setFactors] = useState<MoodFactor[]>(entry?.factors ?? [])
  const [note, setNote] = useState(entry?.note ?? '')
  const [saving, setSaving] = useState(false)

  const isToday = date === isoDay(0)
  const trimmed = note.trim()
  const dirty = entry
    ? level !== entry.level || !sameFactors(factors, entry.factors) || trimmed !== (entry.note ?? '')
    : level !== null
  const canSave = level !== null && dirty && !saving

  const submit = async () => {
    if (level === null) return
    setSaving(true)
    await save({ date, level, factors, note: trimmed || undefined })
    setSaving(false)
  }

  return (
    <section aria-labelledby="checkin-title" className="rounded-card border bg-surface p-4 md:p-5">
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <p className="text-sm text-muted">{isToday ? 'Hari ini' : 'Mengubah catatan'}</p>
          <h2 id="checkin-title" className="font-display text-lg font-bold tracking-tight">
            {fmt(date, 'EEEE, d MMMM')}
          </h2>
        </div>
        {!isToday && (
          <Button variant="ghost" onClick={onBackToToday}>
            Kembali ke hari ini
          </Button>
        )}
      </header>

      <div className="mt-4">
        <MoodScale value={level} onChange={setLevel} />
      </div>

      <div className="mt-5 space-y-2">
        <p id="factors-label" className="text-sm font-medium">
          Apa yang ikut berperan? <span className="font-normal text-muted">(opsional)</span>
        </p>
        <FactorChips value={factors} onChange={setFactors} />
      </div>

      <div className="mt-5">
        <Field label="Catatan singkat (opsional)" htmlFor="mood-note">
          <input
            id="mood-note"
            type="text"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSave) void submit()
            }}
            placeholder="Satu kalimat tentang hari ini"
            className={controlClass}
          />
        </Field>
      </div>

      <footer className="mt-5 flex items-center justify-end gap-3">
        <p aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted">
          {entry && !dirty && (
            <>
              <Check size={14} weight="bold" aria-hidden />
              Tersimpan {fmt(entry.updatedAt, 'HH.mm')}
            </>
          )}
        </p>
        <Button variant="primary" disabled={!canSave} onClick={() => void submit()}>
          Simpan
        </Button>
      </footer>
    </section>
  )
}
