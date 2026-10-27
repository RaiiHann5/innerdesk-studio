import { useMemo, useState, type FormEvent } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Lightbulb, Plus } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession } from '@/types/domain'
import { addClusterTo, deleteClusterWithUndo, deleteIdeaWithUndo, moveIdeaTo, recolorClusterIn, renameClusterIn, toggleIdeaStar } from './actions'
import { ClusterColumn, TRAY_ID } from './ClusterColumn'
import { IdeaChip } from './IdeaChip'
import { MAX_CLUSTER_NAME_LENGTH, clusterNameTaken, groupIdeas } from './lib/ideas'

const toast = (message: string) => useUiStore.getState().showToast(message)

const INSTRUCTIONS =
  'Tekan Spasi untuk mengangkat ide. Panah menggerakkan ide ke kelompok lain, Spasi untuk menjatuhkan, Escape untuk membatalkan. Menu di setiap ide juga bisa memindahkannya.'

/** The pointer decides while there is one. The dragged box's overlap is the fallback, which is what a keyboard drag has. */
const collision: CollisionDetection = (args) => {
  const underPointer = pointerWithin(args)
  return underPointer.length > 0 ? underPointer : rectIntersection(args)
}

interface ClusterStageProps {
  session: BrainstormSession
  onGoCapture: () => void
}

/** Stage 2: sort the ideas into clusters. Drag the grip, or use the menu on each idea. */
export function ClusterStage({ session, onGoCapture }: ClusterStageProps) {
  const [name, setName] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const groups = useMemo(() => groupIdeas(session.ideas, session.clusters), [session.ideas, session.clusters])
  const active = activeId ? session.ideas.find((i) => i.id === activeId) : undefined

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  )

  const textOf = (id: string | number) => session.ideas.find((i) => i.id === id)?.text ?? 'ide'
  const placeName = (id: string | number) => (id === TRAY_ID ? 'Belum dikelompokkan' : (session.clusters.find((c) => c.id === id)?.name ?? 'kelompok'))
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => `Ide "${textOf(a.id)}" diangkat.`,
    onDragOver: ({ active: a, over }) => (over ? `Ide "${textOf(a.id)}" berada di atas ${placeName(over.id)}.` : undefined),
    onDragEnd: ({ active: a, over }) => (over ? `Ide "${textOf(a.id)}" dijatuhkan di ${placeName(over.id)}.` : `Ide "${textOf(a.id)}" dilepas di tempat semula.`),
    onDragCancel: ({ active: a }) => `Pemindahan ide "${textOf(a.id)}" dibatalkan.`,
  }

  const move = (ideaId: string, clusterId: string | undefined) => void moveIdeaTo(session.id, ideaId, clusterId).catch(() => toast('Ide gagal dipindahkan.'))

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = ({ active: a, over }: DragEndEvent) => {
    setActiveId(null)
    if (!over) return
    const target = String(over.id)
    if (target === TRAY_ID) return move(String(a.id), undefined)
    if (session.clusters.some((c) => c.id === target)) move(String(a.id), target)
  }

  const addCluster = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean) return
    if (clusterNameTaken(session.clusters, clean)) return toast('Nama kelompok itu sudah dipakai.')
    setName('')
    addClusterTo(session.id, clean).catch(() => {
      setName(clean)
      toast('Kelompok gagal dibuat.')
    })
  }

  if (session.ideas.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Belum ada ide untuk dikelompokkan"
        description="Tulis beberapa ide dulu di tahap Tangkap, lalu kembali ke sini."
        action={<Button onClick={onGoCapture}>Ke tahap Tangkap</Button>}
      />
    )
  }

  const renderChips = (ideas: typeof session.ideas) =>
    ideas.map((idea) => (
      <IdeaChip
        key={idea.id}
        idea={idea}
        clusters={session.clusters}
        onMove={(clusterId) => move(idea.id, clusterId)}
        onStar={() => void toggleIdeaStar(session.id, idea.id).catch(() => toast('Tanda gagal disimpan.'))}
        onDelete={() => void deleteIdeaWithUndo(session.id, idea).catch(() => toast('Ide gagal dihapus.'))}
      />
    ))

  return (
    <section aria-label="Kelompokkan ide" className="space-y-4">
      <div className="space-y-1.5">
        <form onSubmit={addCluster} className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={MAX_CLUSTER_NAME_LENGTH}
            aria-label="Nama kelompok baru"
            aria-describedby="cluster-hint"
            placeholder="Kelompok baru, mis. Fitur, Desain, Riset"
            autoComplete="off"
            className={cn(controlClass, 'w-full sm:max-w-xs')}
          />
          <Button type="submit" disabled={!name.trim()}>
            <Plus weight="bold" aria-hidden />
            Tambah kelompok
          </Button>
        </form>
        <p id="cluster-hint" className="text-xs text-muted">
          Seret ide ke kelompok, atau pakai menu di setiap ide. Ide yang belum masuk kelompok tetap aman di tray.
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setActiveId(null)}
        accessibility={{ announcements, screenReaderInstructions: { draggable: INSTRUCTIONS } }}
      >
        <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ClusterColumn count={groups.tray.length}>{renderChips(groups.tray)}</ClusterColumn>
          {session.clusters.map((cluster) => {
            const ideas = groups.byCluster.get(cluster.id) ?? []
            return (
              <ClusterColumn
                key={cluster.id}
                cluster={cluster}
                count={ideas.length}
                onRename={(next) => {
                  if (clusterNameTaken(session.clusters, next, cluster.id)) return toast('Nama kelompok itu sudah dipakai.')
                  renameClusterIn(session.id, cluster.id, next).catch(() => toast('Nama kelompok gagal diubah.'))
                }}
                onRecolor={() => void recolorClusterIn(session.id, cluster.id).catch(() => toast('Warna gagal diubah.'))}
                onDelete={() => void deleteClusterWithUndo(session.id, cluster).catch(() => toast('Kelompok gagal dihapus.'))}
              >
                {renderChips(ideas)}
              </ClusterColumn>
            )
          })}
        </div>
        <DragOverlay dropAnimation={reduceMotion ? null : undefined}>
          {active ? <div className="max-w-xs break-words rounded-control border bg-surface px-3 py-2 text-base shadow-lift">{active.text}</div> : null}
        </DragOverlay>
      </DndContext>
    </section>
  )
}
