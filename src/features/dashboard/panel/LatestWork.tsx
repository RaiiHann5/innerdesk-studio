import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckSquare, FolderSimple, NotePencil, type Icon } from '@phosphor-icons/react'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import { StoreGate } from '@/components/ui/StoreGate'
import { timeAgo } from '@/lib/date'
import { projectProgress } from '@/lib/projectStats'
import { isActive } from '@/features/notes/lib/arrange'
import { activeTasks } from '@/lib/taskQuery'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'

const STORES = [useTaskStore, useProjectStore, useNoteStore]

interface Recent {
  key: string
  icon: Icon
  title: string
  kind: string
  to: string
  at: string
}

function Content() {
  const allTasks = useTaskStore((s) => s.items)
  const tasks = useMemo(() => activeTasks(allTasks), [allTasks])
  const allProjects = useProjectStore((s) => s.items)
  // Archived projects are out of sight everywhere, the dashboard included.
  const projects = useMemo(() => allProjects.filter((p) => !p.archivedAt), [allProjects])
  const notes = useNoteStore((s) => s.items)

  const recentProjects = useMemo(() => {
    const byProject = new Map<string, string>()
    ;[...tasks]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .forEach((t) => t.projectId && !byProject.has(t.projectId) && byProject.set(t.projectId, t.updatedAt))
    return [...byProject.keys()]
      .map((id) => projects.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p)
      .slice(0, 2)
  }, [tasks, projects])

  const recent = useMemo<Recent[]>(
    () =>
      [
        ...tasks.map((t) => ({ key: t.id, icon: CheckSquare, title: t.title, kind: `Task ${t.id}`, to: '/tasks', at: t.updatedAt })),
        ...notes.filter(isActive).map((n) => ({ key: n.id, icon: NotePencil, title: n.title, kind: 'Catatan', to: `/notes/${n.id}`, at: n.updatedAt })),
        ...projects.map((p) => ({ key: p.id, icon: FolderSimple, title: p.name, kind: 'Project', to: `/projects/${p.id}`, at: p.updatedAt })),
      ]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 5),
    [tasks, notes, projects],
  )

  if (recent.length === 0) return <p className="text-sm text-muted">Belum ada aktivitas. Task dan catatan yang kamu ubah akan tampil di sini.</p>

  return (
    <div className="space-y-4">
      {recentProjects.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {recentProjects.map((p) => {
            const { percent } = projectProgress(p, tasks)
            return (
              <li key={p.id}>
                <Link to={`/projects/${p.id}`} className="block rounded-card border p-3 hover:bg-sunken/60">
                  <p className="line-clamp-2 min-h-9 text-sm font-medium leading-snug">{p.name}</p>
                  <p className="mt-2 text-xs tabular-nums text-muted">{percent}% selesai</p>
                  <ProgressBar value={percent} label={`Progres ${p.name}`} className="mt-1" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <ul className="-mx-2">
        {recent.map(({ key, icon: ItemIcon, title, kind, to, at }) => (
          <li key={key}>
            <Link to={to} className="flex items-start gap-3 rounded-control px-2 py-2 hover:bg-sunken">
              <ItemIcon size={16} aria-hidden className="mt-0.5 shrink-0 text-muted" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{title}</span>
                <span className="block text-xs text-muted">
                  {kind}, diubah {timeAgo(at)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function LatestWork() {
  return (
    <section aria-labelledby="latest-heading">
      <h2 id="latest-heading" className="mb-3 text-md font-bold">
        Pekerjaan terbaru
      </h2>
      <StoreGate stores={STORES} skeleton={<Skeleton className="h-48" />}>
        <Content />
      </StoreGate>
    </section>
  )
}
