import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Lightbulb, Lightning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Pill } from '@/components/ui/Pill'
import { cn } from '@/lib/cn'
import { useNoteStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Idea, IdeaRating } from '@/types/domain'
import { rateIdea, toggleIdeaStar } from './actions'
import { RatingPicker } from './RatingPicker'
import { StarButton } from './StarButton'
import { isProcessed } from './lib/ideas'
import { QUADRANTS, UNRATED_TITLE, groupByQuadrant, quadrantOf, quadrantTitle, readRating, toggleRating, type RatingField } from './lib/matrix'
import { shorten } from './lib/sessions'

const toast = (message: string) => useUiStore.getState().showToast(message)

interface PrioritizeStageProps {
  session: BrainstormSession
  onGoCapture: () => void
}

/**
 * Stage 3: rate each idea's impact and effort, and the ideas land in a 2×2 matrix. No dragging: the scores are buttons,
 * and the matrix is only where the result shows. Ideas that already became a task, note or project are left out.
 */
export function PrioritizeStage({ session, onGoCapture }: PrioritizeStageProps) {
  const tasks = useTaskStore((s) => s.items)
  const notes = useNoteStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const [announcement, setAnnouncement] = useState('')
  const refocus = useRef<string | null>(null)

  const pending = useMemo(() => {
    const targets = { tasks, notes, projects }
    return session.ideas.filter((i) => !isProcessed(i, targets))
  }, [session.ideas, tasks, notes, projects])
  const hidden = session.ideas.length - pending.length
  const groups = useMemo(() => groupByQuadrant(pending), [pending])
  const rated = pending.length - groups.unrated.length

  // An idea that moves to another quadrant is drawn again, which would drop keyboard focus. Put it back where it was.
  useEffect(() => {
    const key = refocus.current
    if (!key) return
    refocus.current = null
    document.querySelector<HTMLElement>(`[data-rate="${key}"]`)?.focus()
  }, [session.ideas])

  const rate = (idea: Idea, field: RatingField, clicked: IdeaRating) => {
    const value = toggleRating(readRating(idea[field]), clicked)
    const before = quadrantOf(idea)
    const after = quadrantOf({ ...idea, [field]: value })
    refocus.current = `${idea.id}:${field}:${clicked}`
    rateIdea(session.id, idea.id, field, value)
      .then(() => {
        if (after !== before) setAnnouncement(`Ide "${shorten(idea.text, 40)}" ${after ? `masuk ke ${quadrantTitle(after)}` : `kembali ke ${UNRATED_TITLE}`}.`)
      })
      .catch(() => {
        refocus.current = null
        toast('Nilai gagal disimpan.')
      })
  }

  const renderIdeas = (ideas: Idea[]) =>
    ideas.map((idea) => (
      <li key={idea.id} className="space-y-2 rounded-control border bg-surface p-2.5">
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 break-words py-1.5 pl-1 text-base">{idea.text}</p>
          <StarButton starred={idea.starred} onToggle={() => void toggleIdeaStar(session.id, idea.id).catch(() => toast('Tanda gagal disimpan.'))} />
        </div>
        <RatingPicker field="impact" ideaId={idea.id} ideaText={idea.text} value={readRating(idea.impact)} onPick={(clicked) => rate(idea, 'impact', clicked)} />
        <RatingPicker field="effort" ideaId={idea.id} ideaText={idea.text} value={readRating(idea.effort)} onPick={(clicked) => rate(idea, 'effort', clicked)} />
      </li>
    ))

  if (session.ideas.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Belum ada ide untuk dinilai"
        description="Tulis beberapa ide dulu di tahap Tangkap, lalu kembali ke sini untuk menilai dampak dan usahanya."
        action={<Button onClick={onGoCapture}>Ke tahap Tangkap</Button>}
      />
    )
  }

  if (pending.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Semua ide sudah diproses"
        description="Tidak ada ide yang perlu dinilai. Ide baru bisa ditambah di tahap Tangkap kapan saja."
        action={<Button onClick={onGoCapture}>Ke tahap Tangkap</Button>}
      />
    )
  }

  return (
    <section aria-label="Pilih ide" className="space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {rated} dari {pending.length} ide sudah dinilai
        </p>
        <p className="text-xs text-muted">
          Nilai dampak dan usaha tiap ide. Yang sudah punya dua-duanya masuk ke matriks. Sedang dihitung ke sisi tinggi, jadi quick win berarti usaha Ringan. Tekan nilai yang sama sekali lagi
          untuk menghapusnya.
          {hidden > 0 && ` ${hidden} ide yang sudah diproses tidak ditampilkan.`}
        </p>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Bucket title={UNRATED_TITLE} count={groups.unrated.length} empty="Semua ide sudah dinilai">
          {renderIdeas(groups.unrated)}
        </Bucket>
        <div className="grid items-start gap-4 md:grid-cols-2">
          {QUADRANTS.map((q) => (
            <Bucket key={q.id} title={q.title} hint={q.hint} count={groups.byQuadrant[q.id].length} empty="Belum ada ide" highlight={q.id === 'quickWin'}>
              {renderIdeas(groups.byQuadrant[q.id])}
            </Bucket>
          ))}
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </section>
  )
}

interface BucketProps {
  title: string
  hint?: string
  count: number
  empty: string
  highlight?: boolean
  children: ReactNode
}

/** One box on the board: a quadrant, or the tray of ideas still waiting for a score. The quick-win box is set apart. */
function Bucket({ title, hint, count, empty, highlight, children }: BucketProps) {
  return (
    <section aria-label={title} className={cn('min-w-0 rounded-card border', highlight ? 'border-accent-text bg-accent-soft/40' : 'bg-sunken/50')}>
      <header className="space-y-0.5 border-b px-3 py-2">
        <div className="flex min-h-7 items-center gap-2">
          {highlight && <Lightning aria-hidden weight="fill" size={16} className="shrink-0 text-accent-text" />}
          <h3 className={cn('min-w-0 flex-1 truncate text-base font-semibold', title === UNRATED_TITLE && 'text-muted')}>{title}</h3>
          <Pill aria-label={`${count} ide`}>{count}</Pill>
        </div>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </header>
      <ul className="min-h-20 space-y-2 rounded-b-card p-2">
        {children}
        {count === 0 && (
          <li aria-hidden className="px-2 py-5 text-center text-xs text-faint">
            {empty}
          </li>
        )}
      </ul>
    </section>
  )
}
