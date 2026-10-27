import { Trash, X } from '@phosphor-icons/react'
import { Dialog } from '@/components/ui/Dialog'
import { IconButton } from '@/components/ui/IconButton'
import { useNoteTemplateStore } from '@/stores/entities'
import { deleteTemplateWithUndo } from './templateActions'
import { BUILTIN_TEMPLATES, outlineOf, previewOf, toSource, type TemplateSource } from './lib/templates'

interface TemplatePickerProps {
  open: boolean
  onClose: () => void
  onPick: (source: TemplateSource) => void
  /** A note is being created, so choosing another would make a second one. */
  busy?: boolean
}

export function TemplatePicker({ open, onClose, onPick, busy }: TemplatePickerProps) {
  return (
    <Dialog open={open} onClose={onClose} label="Mulai dari template" className="mt-[6vh] max-w-2xl">
      {open && <PickerBody onClose={onClose} onPick={onPick} busy={busy} />}
    </Dialog>
  )
}

function Card({ source, onPick, busy }: { source: TemplateSource; onPick: (source: TemplateSource) => void; busy?: boolean }) {
  const outline = outlineOf(source) || previewOf(source)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onPick(source)}
      className="flex h-full w-full flex-col items-start gap-1 rounded-card border bg-surface p-3 pr-10 text-left transition-colors duration-fast hover:border-faint hover:bg-sunken/50 disabled:pointer-events-none disabled:opacity-60"
    >
      <span className="font-medium">{source.name}</span>
      {source.description && <span className="text-sm text-muted">{source.description}</span>}
      {outline && <span className="mt-1 line-clamp-2 text-xs text-muted/80">{outline}</span>}
    </button>
  )
}

function PickerBody({ onClose, onPick, busy }: Omit<TemplatePickerProps, 'open'>) {
  const mine = useNoteTemplateStore((s) => s.items)
  const saved = [...mine].sort((a, b) => a.name.localeCompare(b.name, 'id')).map(toSource)

  return (
    <div>
      <header className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Mulai dari template</h2>
          <p className="mt-0.5 text-sm text-muted">Catatan baru dengan kerangka yang sudah siap diisi.</p>
        </div>
        <IconButton icon={X} label="Tutup" onClick={onClose} className="-mr-2 -mt-1" />
      </header>

      <div className="max-h-[70dvh] space-y-5 overflow-y-auto p-4">
        <section aria-labelledby="tpl-builtin" className="space-y-2">
          <h3 id="tpl-builtin" className="text-sm font-medium">
            Bawaan
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {BUILTIN_TEMPLATES.map((source) => (
              <li key={source.id}>
                <Card source={source} onPick={onPick} busy={busy} />
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="tpl-mine" className="space-y-2">
          <h3 id="tpl-mine" className="text-sm font-medium">
            Template saya
          </h3>
          {saved.length === 0 ? (
            <p className="rounded-card border border-dashed p-3 text-sm text-muted">Belum ada. Buka sebuah catatan, lalu pilih “Jadikan template” di menu titik tiga untuk menyimpan kerangkanya.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {saved.map((source) => (
                <li key={source.id} className="relative">
                  <Card source={source} onPick={onPick} busy={busy} />
                  <IconButton
                    icon={Trash}
                    label={`Hapus template ${source.name}`}
                    onClick={() => {
                      const stored = mine.find((t) => t.id === source.id)
                      if (stored) void deleteTemplateWithUndo(stored)
                    }}
                    className="absolute right-1.5 top-1.5 size-7 text-md hover:text-status-overdue"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
