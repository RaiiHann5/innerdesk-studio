import { useId, useState } from 'react'
import { Archive, ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { modKey } from '@/lib/hotkeys'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Project } from '@/types/domain'
import { archiveSessionWithUndo, deleteSessionWithUndo, unarchiveSession, updateSessionDetails } from './actions'
import { ProjectSelect } from './ProjectSelect'

const toast = (message: string) => useUiStore.getState().showToast(message)

/** A text field that reads as plain text until it is hovered or focused. */
const quietField = 'w-full rounded-chip bg-transparent px-1.5 py-0.5 -mx-1.5 outline-none transition-colors duration-fast placeholder:text-faint hover:bg-sunken focus-visible:bg-sunken'

interface SessionHeaderProps {
  session: BrainstormSession
  projects: Project[]
}

/** The session's title, question and project. Mount it with `key={session.id}` so its fields start from the session shown. */
export function SessionHeader({ session, projects }: SessionHeaderProps) {
  const id = useId()
  const [title, setTitle] = useState(session.title)
  const [question, setQuestion] = useState(session.question ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const archived = Boolean(session.archivedAt)

  const save = (patch: Parameters<typeof updateSessionDetails>[1]) => updateSessionDetails(session.id, patch).catch(() => toast('Perubahan gagal disimpan.'))

  const commitTitle = () => {
    const clean = title.trim()
    if (!clean) return setTitle(session.title)
    setTitle(clean)
    if (clean !== session.title) void save({ title: clean })
  }
  const commitQuestion = () => {
    const clean = question.trim()
    setQuestion(clean)
    if (clean !== (session.question ?? '')) void save({ question: clean || undefined })
  }

  const menu: MenuItem[] = archived
    ? [{ label: 'Pulihkan sesi', icon: ArrowCounterClockwise, onSelect: () => void unarchiveSession(session).catch(() => toast('Sesi gagal dipulihkan.')) }]
    : [{ label: 'Arsipkan sesi', icon: Archive, onSelect: () => void archiveSessionWithUndo(session).catch(() => toast('Sesi gagal diarsipkan.')) }]
  menu.push({ label: 'Hapus sesi', icon: Trash, tone: 'danger', onSelect: () => setConfirmDelete(true) })

  return (
    <div className="space-y-3 rounded-card border bg-surface p-4 md:p-5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {session.inbox ? (
            <>
              <h2 className="font-display text-lg font-bold tracking-tight">{session.title}</h2>
              <p className="text-sm text-muted">
                Tempat ide yang muncul di tengah pekerjaan. Dari halaman mana pun, tekan {modKey}+K, tulis idenya, lalu pilih &ldquo;Simpan sebagai ide&rdquo;.
              </p>
            </>
          ) : (
            <>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                maxLength={80}
                aria-label="Judul sesi"
                className={`${quietField} font-display text-lg font-bold tracking-tight`}
              />
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onBlur={commitQuestion}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                maxLength={200}
                aria-label="Pertanyaan atau topik"
                placeholder="Tambahkan pertanyaan atau topik sesi ini"
                className={`${quietField} text-sm text-muted`}
              />
            </>
          )}
        </div>
        {!session.inbox && <Menu label="Aksi sesi" items={menu} />}
      </div>

      {!session.inbox && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <label htmlFor={`${id}-project`} className="text-sm font-medium">
            Project
          </label>
          <ProjectSelect id={`${id}-project`} value={session.projectId} projects={projects} onChange={(projectId) => void save({ projectId })} className="w-full sm:max-w-xs" />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        label="Hapus sesi"
        title="Hapus sesi ini?"
        description={`"${session.title}" dan ${session.ideas.length} idenya akan dihapus. Task, catatan, dan project yang sudah dibuat dari sesi ini tidak ikut terhapus.`}
        confirmLabel="Hapus sesi"
        destructive
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void deleteSessionWithUndo(session).catch(() => toast('Sesi gagal dihapus.'))}
      />
    </div>
  )
}
