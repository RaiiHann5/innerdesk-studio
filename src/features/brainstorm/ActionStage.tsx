import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, FolderSimple, Lightbulb, NotePencil, type Icon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Idea, IdeaConversion, IdeaConversionKind } from '@/types/domain'
import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { convertIdea, toggleIdeaStar } from './actions'
import { StarButton } from './StarButton'
import { isProcessed, starredFirst } from './lib/ideas'

const toast = (message: string) => useUiStore.getState().showToast(message)

type Filter = 'belum' | 'bertanda' | 'selesai'

const KIND: Record<IdeaConversionKind, { label: string; icon: Icon; failure: string }> = {
  task: { label: 'Task', icon: CheckSquare, failure: 'Task gagal dibuat.' },
  note: { label: 'Catatan', icon: NotePencil, failure: 'Catatan gagal dibuat.' },
  project: { label: 'Project', icon: FolderSimple, failure: 'Project gagal dibuat.' },
}

const hrefOf = ({ kind, id }: IdeaConversion): string => (kind === 'task' ? '/tasks' : kind === 'note' ? `/notes/${id}` : `/projects/${id}`)
const linkLabelOf = ({ kind, id }: IdeaConversion): string => (kind === 'task' ? `Task ${id}` : KIND[kind].label)

interface ActionStageProps {
  session: BrainstormSession
  onGoCapture: () => void
}

/** Stage 3: turn the ideas worth doing into a task, a note or a project. An idea that became something links to it. */
export function ActionStage({ session, onGoCapture }: ActionStageProps) {
  const [filter, setFilter] = useState<Filter>('belum')
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set())
  const tasks = useTaskStore((s) => s.items)
  const notes = useNoteStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const project = session.projectId ? projects.find((p) => p.id === session.projectId) : undefined

  const clusterById = useMemo(() => new Map(session.clusters.map((c) => [c.id, c])), [session.clusters])
  const { open, starred, processed } = useMemo(() => {
    const targets = { tasks, notes, projects }
    const done = session.ideas.filter((i) => isProcessed(i, targets))
    const pending = starredFirst(session.ideas.filter((i) => !isProcessed(i, targets)))
    return { open: pending, starred: pending.filter((i) => i.starred), processed: done }
  }, [session.ideas, tasks, notes, projects])

  const shown = filter === 'belum' ? open : filter === 'bertanda' ? starred : processed

  const run = async (idea: Idea, kind: IdeaConversionKind) => {
    setBusy((current) => new Set(current).add(idea.id))
    try {
      await convertIdea(session.id, idea.id, kind)
    } catch {
      toast(KIND[kind].failure)
    } finally {
      setBusy((current) => {
        const next = new Set(current)
        next.delete(idea.id)
        return next
      })
    }
  }

  if (session.ideas.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Belum ada ide untuk diproses"
        description="Tulis ide dulu di tahap Tangkap. Yang layak dikerjakan bisa diberi bintang, lalu dijadikan aksi di sini."
        action={<Button onClick={onGoCapture}>Ke tahap Tangkap</Button>}
      />
    )
  }

  return (
    <section aria-label="Jadikan aksi" className="space-y-4">
      <div className="space-y-1.5">
        <SegmentedControl<Filter>
          label="Tampilkan ide"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'belum', label: `Menunggu (${open.length})` },
            { value: 'bertanda', label: `Bertanda (${starred.length})` },
            { value: 'selesai', label: `Diproses (${processed.length})` },
          ]}
        />
        <p className="text-xs text-muted">
          {project ? `Task dan catatan dari ide ini masuk ke project ${project.name}.` : 'Sesi ini belum terhubung ke project, jadi task dan catatan dibuat tanpa project.'}
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={Lightbulb} title={EMPTY[filter].title} description={EMPTY[filter].description} />
      ) : (
        <ul className="space-y-2">
          {shown.map((idea) => {
            const cluster = idea.clusterId ? clusterById.get(idea.clusterId) : undefined
            // Only the "Sudah diproses" list holds ideas whose task, note or project still exists.
            const converted = filter === 'selesai' ? idea.convertedTo : undefined
            return (
              <li key={idea.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-control border bg-surface py-2 pl-1.5 pr-3">
                <StarButton starred={idea.starred} onToggle={() => void toggleIdeaStar(session.id, idea.id).catch(() => toast('Tanda gagal disimpan.'))} />
                <div className="min-w-0 flex-1 basis-56">
                  <p className="break-words text-base">{idea.text}</p>
                  {cluster && (
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                      <span aria-hidden className={cn('size-2 shrink-0 rounded-full', CATEGORY_STYLE[cluster.color].bar)} />
                      <span className="truncate">{cluster.name}</span>
                    </p>
                  )}
                </div>
                {converted ? <ConvertedLink conversion={converted} /> : <ConvertButtons idea={idea} disabled={busy.has(idea.id)} onConvert={(kind) => void run(idea, kind)} />}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const EMPTY: Record<Filter, { title: string; description: string }> = {
  belum: { title: 'Semua ide sudah diproses', description: 'Tidak ada ide yang menunggu. Tambah ide baru di tahap Tangkap kapan saja.' },
  bertanda: { title: 'Belum ada ide bertanda', description: 'Beri bintang pada ide yang paling layak dikerjakan, supaya mudah dicari di sini.' },
  selesai: { title: 'Belum ada yang diproses', description: 'Ide yang dijadikan task, catatan, atau project akan muncul di sini dengan tautannya.' },
}

function ConvertButtons({ idea, disabled, onConvert }: { idea: Idea; disabled: boolean; onConvert: (kind: IdeaConversionKind) => void }) {
  return (
    <div role="group" aria-label={`Jadikan ide: ${idea.text}`} className="flex flex-wrap gap-2">
      {(Object.keys(KIND) as IdeaConversionKind[]).map((kind) => {
        const { label, icon: KindIcon } = KIND[kind]
        return (
          <Button key={kind} disabled={disabled} onClick={() => onConvert(kind)} aria-label={`Jadikan ${label.toLowerCase()}: ${idea.text}`}>
            <KindIcon size={14} aria-hidden />
            {label}
          </Button>
        )
      })}
    </div>
  )
}

function ConvertedLink({ conversion }: { conversion: IdeaConversion }) {
  const { icon: KindIcon } = KIND[conversion.kind]
  return (
    <Link
      to={hrefOf(conversion)}
      aria-label={`Buka ${linkLabelOf(conversion).toLowerCase()}`}
      className="inline-flex h-8 items-center gap-2 rounded-control border px-3 text-sm font-medium transition-colors duration-fast hover:bg-sunken"
    >
      <KindIcon size={14} aria-hidden />
      {linkLabelOf(conversion)}
    </Link>
  )
}
