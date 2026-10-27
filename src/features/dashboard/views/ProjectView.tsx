import { useMemo } from 'react'
import { FolderSimple } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { StoreGate } from '@/components/ui/StoreGate'
import { ProjectCard } from '@/features/projects/ProjectCard'
import { useProjectStore, useTaskStore } from '@/stores/entities'
import { ViewSkeleton } from './ViewSkeleton'

const STORES = [useProjectStore, useTaskStore]

function Grid() {
  const projects = useProjectStore((s) => s.items)
  const tasks = useTaskStore((s) => s.items)
  const sorted = useMemo(
    () =>
      projects
        .filter((p) => !p.archivedAt)
        .sort(
        (a, b) =>
          Number(a.status === 'paused') - Number(b.status === 'paused') || (a.deadline ?? '9').localeCompare(b.deadline ?? '9'),
      ),
    [projects],
  )

  if (sorted.length === 0) {
    return <EmptyState icon={FolderSimple} title="Belum ada project" description="Project mengelompokkan task dan menunjukkan kemajuannya." />
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {sorted.map((p) => (
        <ProjectCard key={p.id} project={p} tasks={tasks} />
      ))}
    </div>
  )
}

export function ProjectView() {
  return (
    <StoreGate stores={STORES} skeleton={<ViewSkeleton columns={2} />}>
      <Grid />
    </StoreGate>
  )
}
