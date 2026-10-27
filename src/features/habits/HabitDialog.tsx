import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { notificationsBlocked, requestNotificationPermission } from '@/features/focus/lib/notifications'
import { Field, controlClass } from '@/components/ui/Field'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import { toISODate } from '@/lib/date'
import { ALL_WEEKDAYS, WEEKDAY_SHORT, appendHabitOrder } from '@/lib/habits'
import { useHabitStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { CategoryColor, Habit, HabitIconKey } from '@/types/domain'
import { ProjectColorPicker } from '../projects/ProjectColorPicker'
import { HABIT_ICONS, HABIT_STYLE, type HabitPreset } from './habitUi'

interface HabitDialogProps {
  open: boolean
  /** Habit to edit. Leave empty to create a new one. */
  habit?: Habit
  /** Fills a new habit's form in. Ignored when editing. */
  preset?: HabitPreset
  onClose: () => void
}

export function HabitDialog({ open, habit, preset, onClose }: HabitDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} label={habit ? 'Ubah kebiasaan' : 'Kebiasaan baru'} className="mt-[6vh] max-w-lg">
      {open && <HabitForm key={habit?.id ?? 'new'} habit={habit} preset={preset} onClose={onClose} />}
    </Dialog>
  )
}

const WEEKDAY_NAME = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
const DAY_PRESETS: Array<{ label: string; days: number[] }> = [
  { label: 'Setiap hari', days: ALL_WEEKDAYS },
  { label: 'Hari kerja', days: [1, 2, 3, 4, 5] },
  { label: 'Akhir pekan', days: [6, 7] },
]
const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d))

type Kind = 'check' | 'count'

function HabitForm({ habit, preset, onClose }: Omit<HabitDialogProps, 'open'>) {
  const habits = useHabitStore((s) => s.items)
  const add = useHabitStore((s) => s.add)
  const update = useHabitStore((s) => s.update)
  const showToast = useUiStore((s) => s.showToast)

  const initial = habit ?? preset
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState<CategoryColor>(initial?.color ?? 'moss')
  const [icon, setIcon] = useState<HabitIconKey>(initial?.icon ?? 'star')
  const [days, setDays] = useState<number[]>(initial?.days ?? ALL_WEEKDAYS)
  const [kind, setKind] = useState<Kind>((initial?.target ?? 1) > 1 ? 'count' : 'check')
  const [target, setTarget] = useState(String(initial?.target && initial.target > 1 ? initial.target : 8))
  const [unit, setUnit] = useState(initial?.unit ?? '')
  const [reminderTime, setReminderTime] = useState(habit?.reminderTime ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggleDay = (day: number) => {
    setError(null)
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b)))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Nama kebiasaan wajib diisi.')
    if (days.length === 0) return setError('Pilih paling sedikit satu hari.')
    const count = Number(target)
    if (kind === 'count' && (!Number.isInteger(count) || count < 2 || count > 999)) return setError('Target harus bilangan bulat antara 2 dan 999.')

    const fields = {
      name: trimmed,
      description: description.trim() || undefined,
      color,
      icon,
      days: [...days].sort((a, b) => a - b),
      target: kind === 'count' ? count : 1,
      unit: kind === 'count' ? unit.trim() || undefined : undefined,
      reminderTime: reminderTime || undefined,
    }
    setSaving(true)
    try {
      if (habit) {
        await update(habit.id, fields)
        showToast('Perubahan disimpan')
      } else {
        await add({ ...fields, startDate: toISODate(new Date()), order: appendHabitOrder(habits) })
        showToast('Kebiasaan dibuat')
      }
      onClose()
    } catch {
      setError('Kebiasaan gagal disimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-4">
        <h2 className="text-lg font-bold tracking-tight">{habit ? 'Ubah kebiasaan' : 'Kebiasaan baru'}</h2>

        <Field label="Nama" htmlFor="habit-name">
          <input
            id="habit-name"
            autoFocus
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            aria-invalid={error !== null && !name.trim()}
            aria-describedby={error ? 'habit-error' : undefined}
            placeholder="Misalnya: Jalan kaki sore"
            className={controlClass}
          />
        </Field>

        <Field label="Catatan" htmlFor="habit-description" hint="Opsional. Pengingat kecil tentang apa yang dihitung selesai.">
          <input id="habit-description" value={description} onChange={(e) => setDescription(e.target.value)} className={controlClass} />
        </Field>

        <div className="space-y-1.5">
          <span id="habit-icon-label" className="text-sm font-medium">
            Ikon
          </span>
          <div role="radiogroup" aria-labelledby="habit-icon-label" className="flex flex-wrap gap-1">
            {HABIT_ICONS.map(({ key, label, icon: IconComponent }) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={key === icon}
                aria-label={label}
                title={label}
                onClick={() => setIcon(key)}
                className={cn(
                  'grid size-9 place-items-center rounded-control border transition-colors duration-fast',
                  key === icon ? cn('border-transparent', HABIT_STYLE[color].tint, HABIT_STYLE[color].text) : 'text-muted hover:border-faint hover:text-ink',
                )}
              >
                <IconComponent size={18} aria-hidden />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">Warna</span>
          <ProjectColorPicker value={color} onChange={setColor} label="Warna kebiasaan" />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Hari</legend>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_SHORT.map((short, i) => {
              const day = i + 1
              const on = days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  aria-label={WEEKDAY_NAME[i]}
                  onClick={() => toggleDay(day)}
                  className={cn('h-8 w-11 rounded-control border text-sm font-medium transition-colors duration-fast', on ? 'border-transparent bg-accent-soft text-accent-text' : 'text-muted hover:border-faint hover:text-ink')}
                >
                  {short}
                </button>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            {DAY_PRESETS.map((p) => (
              <Button key={p.label} variant="ghost" aria-pressed={sameDays(days, p.days)} onClick={() => setDays(p.days)} className="h-7 px-2 text-xs aria-pressed:text-ink">
                {p.label}
              </Button>
            ))}
          </div>
          {habit && <p className="text-xs text-muted">Hari yang diubah ikut menghitung ulang riwayat dan streak.</p>}
        </fieldset>

        <div className="space-y-2">
          <span id="habit-kind-label" className="text-sm font-medium">
            Dihitung selesai kalau
          </span>
          <div>
            <SegmentedControl<Kind>
              label="Cara menghitung"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'check', label: 'Dicentang sekali' },
                { value: 'count', label: 'Mencapai jumlah' },
              ]}
            />
          </div>
          {kind === 'count' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Jumlah per hari" htmlFor="habit-target">
                <input id="habit-target" type="number" inputMode="numeric" min={2} max={999} value={target} onChange={(e) => setTarget(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
              </Field>
              <Field label="Satuan" htmlFor="habit-unit">
                <input id="habit-unit" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="gelas, halaman, menit" className={controlClass} />
              </Field>
            </div>
          )}
          {habit && <p className="text-xs text-muted">Target baru berlaku juga untuk hari-hari sebelumnya.</p>}
        </div>

        <Field
          label="Pengingat"
          htmlFor="habit-reminder"
          hint={
            notificationsBlocked()
              ? 'Notifikasi diblokir di browser, jadi pengingat tampil di dalam aplikasi. Muncul selama Innerdesk terbuka.'
              : 'Opsional. Muncul selama Innerdesk terbuka di browser, hanya di hari terjadwal dan kalau belum selesai.'
          }
        >
          <div className="flex items-center gap-2">
            <input
              id="habit-reminder"
              type="time"
              value={reminderTime}
              onChange={(e) => {
                setReminderTime(e.target.value)
                // Asked here, from a real interaction, so the browser prompt is tied to turning a reminder on.
                if (e.target.value) requestNotificationPermission()
              }}
              className={cn(controlClass, 'w-32 tabular-nums')}
            />
            {reminderTime && (
              <Button variant="ghost" onClick={() => setReminderTime('')}>
                Hapus
              </Button>
            )}
          </div>
        </Field>

        {error && (
          <p id="habit-error" role="alert" className="text-sm font-medium text-status-overdue">
            {error}
          </p>
        )}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button onClick={onClose}>Batal</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {habit ? 'Simpan perubahan' : 'Buat kebiasaan'}
        </Button>
      </footer>
    </form>
  )
}
