import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { ArrowsClockwise, Lightbulb, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Menu } from '@/components/ui/Menu'
import { cn } from '@/lib/cn'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useUiStore } from '@/stores/ui'
import type { BrainstormSession, Idea, IdeaCluster } from '@/types/domain'
import { CATEGORY_STYLE } from '@/features/calendar/categories'
import { addIdeaTo, deleteIdeaWithUndo, editIdea, toggleIdeaStar } from './actions'
import { InlineEdit } from './InlineEdit'
import { StarButton } from './StarButton'
import { MAX_IDEA_LENGTH } from './lib/ideas'
import { lensFor } from './lib/lenses'
import { ideaCount } from './lib/sessions'

const toast = (message: string) => useUiStore.getState().showToast(message)

interface CaptureStageProps {
  session: BrainstormSession
  /** Goes up each time the page asks for the input to take focus (the N shortcut). */
  focusSignal: number
}

/** Stage 1: one input that is always ready. Enter adds an idea, nothing gets filtered yet. */
export function CaptureStage({ session, focusSignal }: CaptureStageProps) {
  const [text, setText] = useState('')
  const [shift, setShift] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // On a phone, focusing on arrival would pop the keyboard over the page before the person asked for it.
  const finePointer = useMediaQuery('(pointer: fine)')

  useEffect(() => {
    if (finePointer || focusSignal > 0) inputRef.current?.focus()
  }, [finePointer, focusSignal, session.id])

  const clusterById = useMemo(() => new Map(session.clusters.map((c) => [c.id, c])), [session.clusters])
  const newestFirst = useMemo(() => [...session.ideas].reverse(), [session.ideas])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = text.trim()
    if (!clean) return
    // Cleared at once so the next idea can be typed while this one saves. Put back if the save fails.
    setText('')
    addIdeaTo(session.id, clean).catch(() => {
      setText((current) => current || clean)
      toast('Ide gagal disimpan.')
    })
  }

  return (
    <section aria-label="Tangkap ide" className="space-y-4">
      <div className="space-y-1.5">
        <form onSubmit={submit} className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_IDEA_LENGTH}
            aria-label="Tulis satu ide"
            aria-describedby="capture-hint"
            placeholder="Tulis satu ide, lalu Enter"
            autoComplete="off"
            className={cn(controlClass, 'h-10 text-md')}
          />
          <Button type="submit" variant="primary" className="h-10 shrink-0" disabled={!text.trim()}>
            <Plus weight="bold" aria-hidden />
            Tambah
          </Button>
        </form>
        <p id="capture-hint" className="text-xs text-muted">
          Satu ide per baris. Jangan disaring dulu, memilah ada di tahap berikutnya.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-card bg-accent-soft px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-accent-text">Pancingan</p>
          <p className="mt-0.5 font-display text-md font-bold leading-snug tracking-tight">{lensFor(session.id, shift)}</p>
        </div>
        <IconButton icon={ArrowsClockwise} label="Ganti pancingan" onClick={() => setShift((n) => n + 1)} />
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-md font-bold tracking-tight">Ide</h2>
        <p role="status" className="text-sm tabular-nums text-muted">
          {ideaCount(session.ideas.length)}
        </p>
      </div>

      {newestFirst.length === 0 ? (
        <EmptyState icon={Lightbulb} title="Belum ada ide" description="Mulai dari apa saja yang terlintas. Pancingan di atas bisa dipakai kalau macet." />
      ) : (
        <ul className="space-y-2">
          {newestFirst.map((idea) => (
            <IdeaRow key={idea.id} sessionId={session.id} idea={idea} cluster={idea.clusterId ? clusterById.get(idea.clusterId) : undefined} />
          ))}
        </ul>
      )}
    </section>
  )
}

function IdeaRow({ sessionId, idea, cluster }: { sessionId: string; idea: Idea; cluster?: IdeaCluster }) {
  const [editing, setEditing] = useState(false)

  const save = (next: string) => {
    setEditing(false)
    if (next.trim() && next.trim() !== idea.text) editIdea(sessionId, idea.id, next).catch(() => toast('Ide gagal diperbarui.'))
  }

  return (
    <li className="flex items-start gap-1 rounded-control border bg-surface py-2 pl-3 pr-1.5">
      <div className="min-w-0 flex-1 self-center">
        {editing ? (
          <InlineEdit value={idea.text} label="Ubah teks ide" maxLength={MAX_IDEA_LENGTH} onSave={save} onCancel={() => setEditing(false)} className="h-8" />
        ) : (
          <p className="break-words text-base">{idea.text}</p>
        )}
        {cluster && !editing && (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className={cn('size-2 shrink-0 rounded-full', CATEGORY_STYLE[cluster.color].bar)} />
            <span className="truncate">{cluster.name}</span>
          </p>
        )}
      </div>
      <StarButton starred={idea.starred} onToggle={() => void toggleIdeaStar(sessionId, idea.id).catch(() => toast('Tanda gagal disimpan.'))} />
      <Menu
        label={`Aksi untuk ide: ${idea.text}`}
        items={[
          { label: 'Ubah teks', icon: PencilSimple, onSelect: () => setEditing(true) },
          { label: 'Hapus ide', icon: Trash, tone: 'danger', onSelect: () => void deleteIdeaWithUndo(sessionId, idea).catch(() => toast('Ide gagal dihapus.')) },
        ]}
      />
    </li>
  )
}
