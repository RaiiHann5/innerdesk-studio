import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { useUiStore } from '@/stores/ui'
import type { Note } from '@/types/domain'
import { saveNoteAsTemplate } from './templateActions'

interface SaveTemplateDialogProps {
  open: boolean
  /** The note as it is on screen right now, which can be a moment ahead of what is stored. */
  note: Pick<Note, 'title' | 'content' | 'tags'>
  onClose: () => void
}

export function SaveTemplateDialog({ open, note, onClose }: SaveTemplateDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} label="Jadikan template" className="mt-[12vh] max-w-md">
      {open && <SaveForm note={note} onClose={onClose} />}
    </Dialog>
  )
}

function SaveForm({ note, onClose }: Omit<SaveTemplateDialogProps, 'open'>) {
  const showToast = useUiStore((s) => s.showToast)
  const [name, setName] = useState(note.title.trim())
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return setError('Nama template wajib diisi.')
    setSaving(true)
    try {
      await saveNoteAsTemplate(note, name, description)
      showToast('Template disimpan')
      onClose()
    } catch {
      setError('Template gagal disimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="space-y-4 p-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Jadikan template</h2>
          <p className="mt-1 text-sm text-muted">Judul, isi, dan tag catatan ini disalin. Sematan dan project tidak ikut.</p>
        </div>
        <Field label="Nama template" htmlFor="tpl-name">
          <input
            id="tpl-name"
            autoFocus
            maxLength={60}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            aria-invalid={error !== null && !name.trim()}
            aria-describedby={error ? 'tpl-error' : undefined}
            placeholder="Misalnya: Rapat mingguan tim"
            className={controlClass}
          />
        </Field>
        <Field label="Deskripsi" htmlFor="tpl-description" hint="Opsional. Muncul di daftar template.">
          <input id="tpl-description" maxLength={120} value={description} onChange={(e) => setDescription(e.target.value)} className={controlClass} />
        </Field>
        {error && (
          <p id="tpl-error" role="alert" className="text-sm font-medium text-status-overdue">
            {error}
          </p>
        )}
      </div>
      <footer className="flex items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button onClick={onClose}>Batal</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          Simpan template
        </Button>
      </footer>
    </form>
  )
}
