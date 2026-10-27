import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Project } from '@/types/domain'
import { createSession } from './actions'
import { ProjectSelect } from './ProjectSelect'

interface SessionDialogProps {
  open: boolean
  projects: Project[]
  onClose: () => void
  onCreated: (session: BrainstormSession) => void
}

export function SessionDialog({ open, projects, onClose, onCreated }: SessionDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} label="Sesi brainstorm baru" className="max-w-md">
      <SessionForm projects={projects} onClose={onClose} onCreated={onCreated} />
    </Dialog>
  )
}

/** Mounted only while the dialog is open, so every opening starts with empty fields. */
function SessionForm({ projects, onClose, onCreated }: Omit<SessionDialogProps, 'open'>) {
  const id = useId()
  const [title, setTitle] = useState('')
  const [question, setQuestion] = useState('')
  const [projectId, setProjectId] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || saving) return
    setSaving(true)
    try {
      const session = await createSession({ title, question, projectId })
      onClose()
      onCreated(session)
    } catch (error) {
      useUiStore.getState().showToast(error instanceof Error ? error.message : 'Sesi gagal dibuat.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="space-y-4 p-4">
        <h2 className="text-md font-bold tracking-tight">Sesi brainstorm baru</h2>
        <Field label="Judul" htmlFor={`${id}-title`}>
          <input id={`${id}-title`} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Mis. Fitur berikutnya untuk Innerdesk" className={controlClass} />
        </Field>
        <Field label="Pertanyaan atau topik" htmlFor={`${id}-question`} hint="Opsional. Satu kalimat yang dijawab oleh semua ide di sesi ini.">
          <input id={`${id}-question`} value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={200} placeholder="Mis. Apa yang paling membantu fokus harian?" className={controlClass} />
        </Field>
        <Field label="Project" htmlFor={`${id}-project`} hint="Opsional. Task dan catatan dari sesi ini masuk ke project yang dipilih.">
          <ProjectSelect id={`${id}-project`} value={projectId} projects={projects} onChange={setProjectId} />
        </Field>
      </div>
      <footer className="flex items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button variant="ghost" onClick={onClose}>
          Batal
        </Button>
        <Button type="submit" variant="primary" disabled={!title.trim() || saving}>
          Buat sesi
        </Button>
      </footer>
    </form>
  )
}
