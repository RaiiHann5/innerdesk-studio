import { SlidersHorizontal } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { notificationsBlocked } from './lib/notifications'
import type { FocusSettings } from '@/types/domain'

interface FocusSettingsPopoverProps {
  settings: FocusSettings
  onChange: (patch: Partial<FocusSettings>) => void
}

const DURATIONS: Array<{ key: 'focusMin' | 'shortMin' | 'longMin'; label: string }> = [
  { key: 'focusMin', label: 'Fokus (menit)' },
  { key: 'shortMin', label: 'Istirahat pendek (menit)' },
  { key: 'longMin', label: 'Istirahat panjang (menit)' },
]

const TOGGLES: Array<{ key: 'autoStart' | 'sound' | 'notifications' | 'characterOn' | 'reduceMotion'; label: string; hint: string }> = [
  { key: 'autoStart', label: 'Mulai otomatis', hint: 'Lanjut ke mode berikutnya tanpa ditekan.' },
  { key: 'sound', label: 'Suara', hint: 'Bunyi halus saat blok selesai.' },
  { key: 'notifications', label: 'Notifikasi', hint: 'Ingat saat blok selesai, walau tab tidak aktif.' },
  { key: 'characterOn', label: 'Tampilkan karakter', hint: 'Matikan kalau hanya ingin lihat lingkarannya.' },
  { key: 'reduceMotion', label: 'Kurangi animasi', hint: 'Berhenti diam, hanya gambar diam.' },
]

/** Durations and behaviour for the timer. Everything here writes straight to the persisted store. */
export function FocusSettingsPopover({ settings, onChange }: FocusSettingsPopoverProps) {
  const blocked = notificationsBlocked()

  return (
    <Popover
      label="Pengaturan fokus"
      className="w-80"
      renderTrigger={({ ref, ...props }) => (
        <Button ref={ref} {...props}>
          <SlidersHorizontal aria-hidden />
          Pengaturan
        </Button>
      )}
    >
      <div className="space-y-4 p-4">
        <section className="space-y-3">
          <h3 className="text-sm font-bold">Durasi</h3>
          <div className="grid grid-cols-2 gap-3">
            {DURATIONS.map((d) => (
              <Field key={d.key} label={d.label} htmlFor={`focus-${d.key}`}>
                <input
                  id={`focus-${d.key}`}
                  type="number"
                  min={1}
                  max={180}
                  step={1}
                  value={settings[d.key]}
                  onChange={(e) => onChange({ [d.key]: Math.max(1, Math.min(180, Number(e.target.value) || 1)) })}
                  className={cn(controlClass, 'tabular-nums')}
                />
              </Field>
            ))}
            <Field label="Istirahat panjang setiap" htmlFor="focus-long-every" hint="Sesi fokus.">
              <input
                id="focus-long-every"
                type="number"
                min={1}
                max={12}
                step={1}
                value={settings.longEvery}
                onChange={(e) => onChange({ longEvery: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })}
                className={cn(controlClass, 'tabular-nums')}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-1 border-t pt-3">
          <h3 className="pb-1 text-sm font-bold">Perilaku</h3>
          {TOGGLES.map((toggle) => (
            <label
              key={toggle.key}
              className="flex cursor-pointer items-start gap-2.5 rounded-control px-1 py-1.5 hover:bg-sunken"
            >
              <input
                type="checkbox"
                checked={settings[toggle.key]}
                onChange={(e) => onChange({ [toggle.key]: e.target.checked })}
                className="mt-0.5 size-4 shrink-0 accent-accent"
              />
              <span className="min-w-0">
                <span className="block text-sm">{toggle.label}</span>
                <span className="block text-xs text-muted">{toggle.hint}</span>
              </span>
            </label>
          ))}
        </section>

        {settings.sound && (
          <label className="block space-y-1 border-t px-1 pt-3">
            <span className="flex items-center justify-between text-sm">
              Volume
              <span className="text-xs tabular-nums text-muted">{Math.round(settings.volume * 100)}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(e) => onChange({ volume: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </label>
        )}

        {settings.notifications && blocked && (
          <p className="rounded-control border border-dashed px-2 py-2 text-xs text-muted">
            Notifikasi diblokir di pengaturan browser. Timer tetap berjalan, hanya pengingatnya yang tidak muncul.
          </p>
        )}
      </div>
    </Popover>
  )
}