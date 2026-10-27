import { useState, type FormEvent } from 'react'
import { Archive, Trash, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { Popover } from '@/components/ui/Popover'
import { cn } from '@/lib/cn'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels'
import { mergeTags, parseTags } from '@/lib/taskFields'
import type { NewEntity, Priority, Project, Task, TaskStatus } from '@/types/domain'

interface BulkBarProps {
  count: number
  projects: Project[]
  /** Applies one patch to every selected task. The patch may depend on the task, as tags do. */
  onApply: (patchFor: (task: Task) => Partial<NewEntity<Task>>) => void
  onArchive: () => void
  onDelete: () => void
  onClear: () => void
}

const STATUSES = Object.keys(STATUS_LABEL) as TaskStatus[]
const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[]
const NO_PROJECT = '__none'
const selectClass = cn(controlClass, 'w-auto min-w-28')

type Menu = 'due' | 'tags' | null

/**
 * What can be done to the selected rows. The count sits in a polite live region, so it is announced as
 * rows are picked, and the region stays in the page while nothing is selected so the first pick is heard too.
 */
export function BulkBar({ count, projects, onApply, onArchive, onDelete, onClear }: BulkBarProps) {
  const [menu, setMenu] = useState<Menu>(null)
  const [due, setDue] = useState('')
  const [tags, setTags] = useState('')

  /** The selects are controlled and snap back to their placeholder, so the chosen value is read before anything else runs. */
  const pick = (value: string, patch: (value: string) => Partial<NewEntity<Task>>) => {
    if (value) onApply(() => patch(value))
  }
  const closeAfter = (run: () => void) => {
    run()
    setMenu(null)
  }
  const applyDue = (e: FormEvent) => {
    e.preventDefault()
    closeAfter(() => onApply(() => (due ? { dueDate: due } : {})))
    setDue('')
  }
  const applyTags = (e: FormEvent) => {
    e.preventDefault()
    const added = parseTags(tags)
    if (added.length === 0) return
    closeAfter(() => onApply((t) => ({ tags: mergeTags(t.tags, added) })))
    setTags('')
  }

  return (
    <div>
      <p role="status" aria-live="polite" className="sr-only">
        {count > 0 ? `${count} task dipilih.` : ''}
      </p>
      {count > 0 && (
        <div role="toolbar" aria-label="Aksi untuk task terpilih" className="flex flex-wrap items-center gap-2 rounded-card border bg-surface p-2">
          <span className="px-2 text-sm font-medium tabular-nums">{count} dipilih</span>

          <select
            aria-label="Ubah status"
            value=""
            onChange={(e) => pick(e.target.value, (v) => ({ status: v as TaskStatus }))}
            className={selectClass}
          >
            <option value="">Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <select
            aria-label="Ubah prioritas"
            value=""
            onChange={(e) => pick(e.target.value, (v) => ({ priority: v as Priority }))}
            className={selectClass}
          >
            <option value="">Prioritas</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
          {projects.length > 0 && (
            <select
              aria-label="Pindahkan ke project"
              value=""
              onChange={(e) => pick(e.target.value, (v) => ({ projectId: v === NO_PROJECT ? undefined : v }))}
              className={selectClass}
            >
              <option value="">Project</option>
              <option value={NO_PROJECT}>Tanpa project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <Popover
            label="Atur tenggat"
            open={menu === 'due'}
            onOpenChange={(open) => setMenu(open ? 'due' : null)}
            className="left-0 right-auto w-64"
            renderTrigger={(props) => <Button {...props}>Tenggat</Button>}
          >
            <form onSubmit={applyDue} className="space-y-3 p-3">
              <label className="block space-y-1.5 text-sm font-medium">
                Tenggat baru
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={cn(controlClass, 'tabular-nums')} />
              </label>
              <div className="flex gap-2">
                <Button type="submit" variant="primary" disabled={!due}>
                  Terapkan
                </Button>
                <Button onClick={() => closeAfter(() => onApply(() => ({ dueDate: undefined, dueTime: undefined })))}>Hapus tenggat</Button>
              </div>
            </form>
          </Popover>

          <Popover
            label="Tambah tag"
            open={menu === 'tags'}
            onOpenChange={(open) => setMenu(open ? 'tags' : null)}
            className="left-0 right-auto w-64"
            renderTrigger={(props) => <Button {...props}>Tag</Button>}
          >
            <form onSubmit={applyTags} className="space-y-3 p-3">
              <label className="block space-y-1.5 text-sm font-medium">
                Tambah tag
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="frontend, revisi" className={controlClass} />
                <span className="block text-xs font-normal text-muted">Pisahkan dengan koma. Tag lama tetap ada.</span>
              </label>
              <Button type="submit" variant="primary" disabled={parseTags(tags).length === 0}>
                Tambahkan
              </Button>
            </form>
          </Popover>

          <span className="ml-auto flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={onArchive}>
              <Archive aria-hidden />
              Arsipkan
            </Button>
            <Button variant="ghost" onClick={onDelete} className="text-status-overdue">
              <Trash aria-hidden />
              Hapus
            </Button>
            <Button variant="ghost" onClick={onClear}>
              <X aria-hidden />
              Batal pilih
            </Button>
          </span>
        </div>
      )}
    </div>
  )
}
