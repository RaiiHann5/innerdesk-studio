import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { recurrenceLabel } from '@/lib/taskRecurrence'
import { formatDuration, parseEstimate } from '@/lib/taskTime'
import type { TaskRecurrence, TaskRecurrenceFreq } from '@/types/domain'

const FREQS: { value: TaskRecurrenceFreq; label: string; unit: string }[] = [
  { value: 'daily', label: 'Setiap hari', unit: 'hari' },
  { value: 'weekly', label: 'Setiap minggu', unit: 'minggu' },
  { value: 'monthly', label: 'Setiap bulan', unit: 'bulan' },
]

interface RecurrenceFieldProps {
  id: string
  value: TaskRecurrence | undefined
  onChange: (next: TaskRecurrence | undefined) => void
}

/** "Tidak berulang" or a rule with an interval. Finishing the task creates the next copy. */
export function RecurrenceField({ id, value, onChange }: RecurrenceFieldProps) {
  const unit = FREQS.find((f) => f.value === value?.freq)?.unit
  return (
    <Field
      label="Pengulangan"
      htmlFor={id}
      hint={value ? `${recurrenceLabel(value)}. Saat task selesai, salinan berikutnya dibuat otomatis.` : undefined}
    >
      <div className="flex items-center gap-2">
        <select
          id={id}
          value={value?.freq ?? ''}
          onChange={(e) => {
            const freq = e.target.value as TaskRecurrenceFreq | ''
            onChange(freq ? { freq, interval: value?.interval ?? 1 } : undefined)
          }}
          className={controlClass}
        >
          <option value="">Tidak berulang</option>
          {FREQS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        {value && (
          <span className="flex shrink-0 items-center gap-2 text-sm text-muted">
            <input
              type="number"
              aria-label="Selang pengulangan"
              min={1}
              max={99}
              value={value.interval}
              onChange={(e) => onChange({ ...value, interval: Math.max(1, Math.min(99, Math.floor(Number(e.target.value)) || 1)) })}
              className={cn(controlClass, 'w-16 tabular-nums')}
            />
            {unit}
          </span>
        )}
      </div>
    </Field>
  )
}

interface EstimateFieldProps {
  id: string
  /** What is typed. Blank means no estimate. */
  text: string
  onText: (next: string) => void
}

/** Planned effort in minutes. Shows the same length in hours once it is long enough to be hard to read. */
export function EstimateField({ id, text, onText }: EstimateFieldProps) {
  const parsed = parseEstimate(text)
  const invalid = text.trim() !== '' && parsed === undefined
  return (
    <Field
      label="Estimasi (menit)"
      htmlFor={id}
      hint={invalid ? 'Isi dengan bilangan bulat menit, misalnya 90.' : parsed && parsed >= 60 ? `Sekitar ${formatDuration(parsed)}.` : undefined}
    >
      <input
        id={id}
        inputMode="numeric"
        value={text}
        onChange={(e) => onText(e.target.value)}
        aria-invalid={invalid}
        placeholder="Misalnya 90"
        className={cn(controlClass, 'tabular-nums', invalid && 'border-status-overdue')}
      />
    </Field>
  )
}
