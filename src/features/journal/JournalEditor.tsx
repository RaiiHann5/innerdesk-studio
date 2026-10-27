import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { Check, HandsPraying, Hash, Heart, Lightbulb, Sparkle, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { IconButton } from '@/components/ui/IconButton'
import { MoodFace } from '@/features/mood/MoodFace'
import { MOOD_LABEL } from '@/features/mood/lib/levels'
import { fmt, isoDay } from '@/lib/date'
import { EMPTY_DOC, docToText } from '@/lib/editorDoc'
import { useUiStore } from '@/stores/ui'
import type { EditorDoc, JournalEntry, MoodEntry } from '@/types/domain'
import { GratitudeField } from './GratitudeField'
import { LearningField } from './LearningField'
import { MoodPicker } from './MoodPicker'
import { PromptCard } from './PromptCard'
import { RichField } from './RichField'
import { SaveStatus } from './SaveStatus'
import { Section, counts } from './Section'
import { TagField } from './TagField'
import { useAutosave } from './hooks/useAutosave'
import { useJournalActions, type JournalDraft } from './hooks/useJournalActions'
import { countWords, percentDone, partsDone, readingMinutes } from './lib/progress'

interface JournalEditorProps {
  /** Keyed by the parent on date, so one mounted editor is always one day. */
  date: string
  entry: JournalEntry | undefined
  mood: MoodEntry | undefined
  /** After the day was deleted or restored by undo, so the parent can mount a fresh editor with the right text. */
  onReset: (date: string) => void
}

export function JournalEditor({ date, entry, mood, onReset }: JournalEditorProps) {
  const { saveDraft, remove } = useJournalActions()
  const { saver, status } = useAutosave<JournalDraft>((draft) => saveDraft(date, draft))
  const showToast = useUiStore((s) => s.showToast)

  const [gratitude, setGratitude] = useState(entry?.gratitude ?? [])
  const [tags, setTags] = useState(entry?.tags ?? [])
  const [learning, setLearning] = useState(entry?.learning ?? '')
  const [highlights, setHighlights] = useState(() => (entry ? docToText(entry.content) : ''))
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const editorRef = useRef<Editor | null>(null)
  // The newest value of every field, read by whichever one changed last. They all feed one autosave.
  const draft = useRef<JournalDraft>({
    title: entry?.title,
    content: entry?.content ?? EMPTY_DOC,
    gratitude,
    tags,
    learning,
  })
  const patch = (next: Partial<JournalDraft>) => {
    draft.current = { ...draft.current, ...next }
    saver.schedule(draft.current)
  }

  const parts = partsDone(mood, {
    content: draft.current.content,
    gratitude,
    learning,
  })
  const words = countWords([...gratitude, highlights, learning].join(' '))
  const isToday = date === isoDay(0)

  const saveNow = async () => {
    await saver.flush()
    showToast('Catatan tersimpan')
  }

  const confirmDelete = async () => {
    if (!entry) return
    // Whatever is waiting must not be written back after the day is deleted.
    saver.cancel()
    // A save that is already running has to land before the delete, or it would write the day back.
    await saver.flush()
    const deleted = await remove(entry, () => onReset(date))
    if (deleted) onReset(date)
  }

  return (
    <article aria-labelledby="journal-day" className="rounded-card border bg-surface">
      <PromptCard date={date} onAnswer={() => editorRef.current?.commands.focus('end')} />

      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pb-4 pt-5 md:px-6">
        <div>
          <p className="text-sm text-muted">{isToday ? 'Hari ini' : 'Catatan hari'}</p>
          <h2 id="journal-day" className="font-display text-xl font-bold tracking-tight">
            {fmt(date, 'EEEE, d MMMM yyyy')}
          </h2>
          {mood && (
            <p className="mt-2 flex items-center gap-2 text-sm text-muted">
              <MoodFace level={mood.level} size={22} />
              Hari ini terasa <span className="font-medium text-ink">{MOOD_LABEL[mood.level].toLowerCase()}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <SaveStatus status={status} onRetry={() => void saver.flush()} />
          {entry && <IconButton icon={Trash} label={`Hapus catatan ${fmt(date, 'd MMMM')}`} onClick={() => setConfirmingDelete(true)} />}
        </div>
      </header>

      <Section id="mood" icon={Heart} title="Bagaimana harimu?" done={parts.mood}>
        <MoodPicker date={date} entry={mood} />
      </Section>

      <Section id="gratitude" icon={HandsPraying} title="Syukur" done={parts.gratitude} aside={`${gratitude.length} dari 8`}>
        <GratitudeField
          value={gratitude}
          onChange={(next) => {
            setGratitude(next)
            patch({ gratitude: next })
          }}
        />
      </Section>

      <Section id="tags" icon={Hash} title="Tag" done={tags.length > 0}>
        <TagField
          value={tags}
          onChange={(next) => {
            setTags(next)
            patch({ tags: next })
          }}
        />
      </Section>

      <Section id="highlights" icon={Sparkle} title="Sorotan" done={parts.highlights} aside={counts(highlights.trim(), countWords(highlights))}>
        <RichField
          label="Sorotan hari ini"
          placeholder="Apa yang berjalan baik hari ini?"
          value={draft.current.content}
          onReady={(editor) => {
            editorRef.current = editor
          }}
          onChange={(content: EditorDoc, text) => {
            setHighlights(text)
            patch({ content })
          }}
        />
      </Section>

      <Section id="learning" icon={Lightbulb} title="Pelajaran" done={parts.learning} aside={counts(learning.trim(), countWords(learning))}>
        <LearningField
          value={learning}
          onChange={(next) => {
            setLearning(next)
            patch({ learning: next })
          }}
        />
      </Section>

      <footer className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-b-card border-t bg-surface px-4 py-3 md:px-6">
        <p className="flex flex-wrap gap-x-4 text-xs tabular-nums text-muted">
          <span>{words} kata</span>
          <span>{readingMinutes(words)} mnt baca</span>
          <span>{percentDone(parts)}% lengkap</span>
        </p>
        <Button variant="primary" onClick={() => void saveNow()}>
          <Check size={14} weight="bold" aria-hidden />
          Simpan
        </Button>
      </footer>

      <ConfirmDialog
        open={confirmingDelete}
        label="Hapus catatan jurnal"
        title={`Hapus catatan ${fmt(date, 'd MMMM')}?`}
        description="Sorotan, syukur, pelajaran, dan tag hari itu akan dihapus. Mood-nya tetap ada. Kamu masih bisa mengurungkannya sesaat setelahnya."
        confirmLabel="Hapus"
        destructive
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirmingDelete(false)}
      />
    </article>
  )
}
