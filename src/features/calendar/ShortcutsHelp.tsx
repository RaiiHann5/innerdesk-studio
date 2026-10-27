import { ListChecks } from '@phosphor-icons/react'
import { Popover } from '@/components/ui/Popover'
import { modKey } from '@/lib/hotkeys'
import type { CalendarView } from './lib/range'

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-control border bg-surface px-1.5 py-0.5 text-xs font-medium text-ink">{children}</kbd>
)

interface Shortcut {
  keys: string[]
  label: string
}

const SECTIONS: Array<{ title: string; items: Shortcut[] }> = [
  {
    title: 'Navigasi',
    items: [
      { keys: ['T'], label: 'Lompat ke hari ini' },
      { keys: ['J', '→'], label: 'Ke periode berikutnya' },
      { keys: ['K', '←'], label: 'Ke periode sebelumnya' },
      { keys: ['D'], label: 'Tampilan hari' },
      { keys: ['W'], label: 'Tampilan minggu' },
      { keys: ['M'], label: 'Tampilan bulan' },
      { keys: ['Y'], label: 'Tampilan tahun' },
    ],
  },
  {
    title: 'Event',
    items: [
      { keys: ['N'], label: 'Event baru' },
      { keys: [modKey, 'Enter'], label: 'Simpan event yang sedang diedit' },
      { keys: ['Esc'], label: 'Batal, atau tutup panel' },
    ],
  },
  {
    title: 'Seret dan lepas',
    items: [
      { keys: ['Enter'], label: 'Angkat atau jatuhkan event' },
      { keys: ['↑', '↓'], label: 'Geser 15 menit' },
      { keys: ['←', '→'], label: 'Geser satu hari' },
      { keys: ['Esc'], label: 'Batalkan pemindahan' },
    ],
  },
  {
    title: 'Aplikasi',
    items: [
      { keys: [modKey, 'K'], label: 'Cari dan catat cepat' },
      { keys: ['?'], label: 'Buka bantuan ini' },
    ],
  },
]

const VIEW_LABEL: Record<CalendarView, string> = {
  day: 'hari',
  week: 'minggu',
  month: 'bulan',
  year: 'tahun',
}

/**
 * Every shortcut in one place, opened with "?" or from the toolbar.
 *
 * The list is the documentation: if a shortcut changes, this file is where it has to change too,
 * which is why the groups are named after what the person is doing rather than after the keys.
 */
export function ShortcutsHelp({ view, open, onOpenChange }: { view: CalendarView; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const sections = SECTIONS.map((section) =>
    section.title === 'Navigasi'
      ? {
          ...section,
          items: section.items.map((item) =>
            item.keys[0] === 'D' ? { ...item, label: `Tampilan ${VIEW_LABEL[view]} tersedia lewat D sampai Y` } : item,
          ),
        }
      : section,
  )

  return (
    <Popover
      label="Pintasan papan tik"
      className="w-80"
      open={open}
      onOpenChange={onOpenChange}
      renderTrigger={({ ref, ...props }) => (
        <button
          ref={ref}
          {...props}
          className="inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-sm font-medium text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink"
        >
          <ListChecks size={16} aria-hidden />
          <span className="hidden sm:inline">Pintasan</span>
        </button>
      )}
    >
      <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4 text-sm">
        <h2 className="text-md font-bold">Pintasan papan tik</h2>
        {sections.map((section) => (
          <section key={section.title}>
            <h3 className="mb-1 text-xs font-medium text-muted">{section.title}</h3>
            <dl className="space-y-1">
              {section.items.map((item) => (
                <div key={`${section.title}-${item.label}`} className="flex items-center justify-between gap-3">
                  <dt className="min-w-0 text-ink">{item.label}</dt>
                  <dd className="flex shrink-0 gap-1">
                    {item.keys.map((key) => (
                      <Kbd key={key}>{key}</Kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Popover>
  )
}