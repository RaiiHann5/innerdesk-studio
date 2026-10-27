import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Archive, Copy } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Dialog } from '@/components/ui/Dialog'
import { Field, controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { newProject } from '@/lib/entityDefaults'
import { PROJECT_STATUS_LABEL } from '@/lib/labels'
import { PHASES, PHASE_LABEL } from '@/lib/projectPhase'
import { useProjectStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { CategoryColor, Project, ProjectPhase, ProjectStatus } from '@/types/domain'
import { ProjectColorPicker } from './ProjectColorPicker'
import { archiveProjectWithUndo, duplicateProjectWithUndo } from './projectActions'

interface ProjectDialogProps {
  open: boolean
  /** Project to edit. Leave empty to create a new one. */
  project?: Project
  onClose: () => void
  onSaved?: (project: Project) => void
}

const STATUSES = Object.keys(PROJECT_STATUS_LABEL) as ProjectStatus[]

export function ProjectDialog({ open, project, onClose, onSaved }: ProjectDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} label={project ? 'Ubah project' : 'Project baru'} className="mt-[8vh] max-w-lg">
      {open && <ProjectForm key={project?.id ?? 'new'} project={project} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  )
}

type Confirming = 'archive' | 'duplicate' | null

function ProjectForm({ project, onClose, onSaved }: Omit<ProjectDialogProps, 'open'>) {
  const navigate = useNavigate()
  const add = useProjectStore((s) => s.add)
  const update = useProjectStore((s) => s.update)
  const showToast = useUiStore((s) => s.showToast)

  const [name, setName] = useState(project?.name ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [goal, setGoal] = useState(project?.goal ?? '')
  const [color, setColor] = useState<CategoryColor>(project?.color ?? 'slate')
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? 'active')
  const [phase, setPhase] = useState<ProjectPhase>(project?.phase ?? 'riset')
  const [startDate, setStartDate] = useState(project?.startDate ?? '')
  const [deadline, setDeadline] = useState(project?.deadline ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState<Confirming>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Nama project wajib diisi.')
    if (startDate && deadline && startDate > deadline) return setError('Tanggal mulai tidak boleh setelah tenggat.')
    setSaving(true)
    const fields = {
      name: trimmed,
      description: description.trim() || undefined,
      goal: goal.trim() || undefined,
      color,
      status,
      phase,
      startDate: startDate || undefined,
      deadline: deadline || undefined,
    }
    try {
      if (project) {
        await update(project.id, fields)
        showToast('Perubahan disimpan')
        onSaved?.({ ...project, ...fields })
      } else {
        const created = await add(newProject(fields))
        showToast('Project dibuat')
        onSaved?.(created)
      }
      onClose()
    } catch {
      setError('Project gagal disimpan. Coba lagi.')
      setSaving(false)
    }
  }

  const archive = async () => {
    if (!project) return
    setConfirming(null)
    try {
      await archiveProjectWithUndo(project)
      onClose()
    } catch {
      setError('Project gagal diarsipkan. Coba lagi.')
    }
  }

  const duplicate = async () => {
    if (!project) return
    setConfirming(null)
    setSaving(true)
    try {
      const copy = await duplicateProjectWithUndo(project)
      onClose()
      navigate(`/projects/${copy.id}`)
    } catch {
      setError('Project gagal diduplikasi. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <>
      <form onSubmit={submit} noValidate>
        <div className="max-h-[75dvh] space-y-4 overflow-y-auto p-4">
          <h2 className="text-lg font-bold tracking-tight">{project ? 'Ubah project' : 'Project baru'}</h2>

          <Field label="Nama" htmlFor="project-name">
            <input
              id="project-name"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError(null)
              }}
              aria-invalid={error !== null && !name.trim()}
              aria-describedby={error ? 'project-error' : undefined}
              placeholder="Misalnya: Redesain situs klien"
              className={controlClass}
            />
          </Field>

          <Field label="Deskripsi" htmlFor="project-description">
            <textarea id="project-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(controlClass, 'h-auto resize-none py-1.5')} />
          </Field>

          <Field label="Tujuan" htmlFor="project-goal" hint="Satu kalimat tentang hasil yang ingin dicapai.">
            <input id="project-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Misalnya: Warga mengurus surat dari rumah" className={controlClass} />
          </Field>

          <div className="space-y-1.5">
            <span id="project-color-label" className="text-sm font-medium">
              Warna
            </span>
            <ProjectColorPicker value={color} onChange={setColor} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" htmlFor="project-status">
              <select id="project-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)} className={controlClass}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROJECT_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fase" htmlFor="project-phase">
              <select id="project-phase" value={phase} onChange={(e) => setPhase(e.target.value as ProjectPhase)} className={controlClass}>
                {PHASES.map((p) => (
                  <option key={p} value={p}>
                    {PHASE_LABEL[p]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tanggal mulai" htmlFor="project-start">
              <input id="project-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
            </Field>
            <Field label="Tenggat" htmlFor="project-deadline">
              <input id="project-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
            </Field>
          </div>

          {error && (
            <p id="project-error" role="alert" className="text-sm font-medium text-status-overdue">
              {error}
            </p>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-sunken/50 px-4 py-3">
          <span className="flex items-center gap-1">
            {project && (
              <>
                <Button variant="ghost" onClick={() => setConfirming('archive')} disabled={saving}>
                  <Archive aria-hidden />
                  Arsipkan
                </Button>
                <Button variant="ghost" onClick={() => setConfirming('duplicate')} disabled={saving}>
                  <Copy aria-hidden />
                  Duplikat
                </Button>
              </>
            )}
          </span>
          <span className="flex items-center gap-2">
            <Button onClick={onClose}>Batal</Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {project ? 'Simpan perubahan' : 'Buat project'}
            </Button>
          </span>
        </footer>
      </form>

      <ConfirmDialog
        open={confirming === 'archive'}
        label="Arsipkan project"
        title="Arsipkan project ini?"
        description="Project hilang dari papan, daftar, dan dashboard. Task, catatan, dan tautannya tetap tersimpan, dan project bisa dipulihkan dari tab Arsip."
        confirmLabel="Arsipkan"
        onConfirm={() => void archive()}
        onClose={() => setConfirming(null)}
      />
      <ConfirmDialog
        open={confirming === 'duplicate'}
        label="Duplikat project"
        title="Duplikat project ini?"
        description="Salinan berisi task sebagai belum mulai tanpa tenggat, serta milestone tanpa centang dan tanggal. Waktu terlacak dan catatan tidak ikut disalin."
        confirmLabel="Duplikat"
        onConfirm={() => void duplicate()}
        onClose={() => setConfirming(null)}
      />
    </>
  )
}
