import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from '@phosphor-icons/react'
import { SheetPanel } from '@/components/layout/SheetPanel'
import { IconButton } from '@/components/ui/IconButton'
import { useMediaQuery } from '@/lib/useMediaQuery'
import { useSettingsStore } from '@/stores/settings'
import { useNoteStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Note } from '@/types/domain'
import { archiveNoteWithUndo, deleteNoteWithUndo, unarchiveNote } from './actions'
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import { EditorToolbar } from './EditorToolbar'
import type { SlashMenuState } from './extensions/slashCommand'
import { useAutosave } from './hooks/useAutosave'
import { useNote, type NoteDraft } from './hooks/useNote'
import { useNoteEditor } from './hooks/useNoteEditor'
import { collectTags } from './lib/arrange'
import { NoteMissing } from './NoteEditorStates'
import { NotePaper } from './NotePaper'
import { NoteTopBar, PANEL_TOGGLE_ID } from './NoteTopBar'
import { SaveTemplateDialog } from './SaveTemplateDialog'
import { SlashMenu } from './SlashMenu'
import { ViewPanel } from './ViewPanel'

type Meta = Omit<NoteDraft, 'content'>

const PANEL_ID = 'note-view-panel'

interface NoteEditorFormProps {
  note: Note
  save: (id: string, draft: NoteDraft) => Promise<void>
}

/** One note's page. It is keyed by note id, so each note gets its own TipTap instance and its own autosave. */
function NoteEditorForm({ note, save }: NoteEditorFormProps) {
  const navigate = useNavigate()
  const allNotes = useNoteStore((s) => s.items)
  const tagPool = useMemo(() => collectTags(allNotes), [allNotes])
  const isWide = useMediaQuery('(min-width: 1024px)')
  const panelOpen = useSettingsStore((s) => s.notePanelOpen)
  const setPanelOpen = useSettingsStore((s) => s.setNotePanelOpen)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [meta, setMeta] = useState<Meta>({ title: note.title, tags: note.tags, pinned: note.pinned, projectId: note.projectId })
  // The latest text of the whole note. The document lives in TipTap, so typing never re-renders this component.
  const draft = useRef<NoteDraft>({ ...meta, content: note.content })
  const { status, savedAt, schedule, flush, cancel, retry } = useAutosave<NoteDraft>({ id: note.id, save })

  const [confirming, setConfirming] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [slash, setSlash] = useState<SlashMenuState | null>(null)
  const slashKeys = useRef<(event: KeyboardEvent) => boolean>(() => false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const backRef = useRef<HTMLAnchorElement>(null)
  const [startsBlank] = useState(() => !note.title && !note.excerpt)

  useEffect(() => {
    // A note that was just created opens with the title ready to type in.
    if (startsBlank) titleRef.current?.focus()
    // Otherwise the card that was pressed is gone, so focus lands on the way back instead of on the page top.
    else backRef.current?.focus()
  }, [startsBlank])

  const change = useCallback(
    (patch: Partial<Meta>) => {
      draft.current = { ...draft.current, ...patch }
      setMeta((m) => ({ ...m, ...patch }))
      schedule(draft.current)
    },
    [schedule],
  )

  const editor = useNoteEditor({
    content: note.content,
    onContent: (content) => {
      draft.current = { ...draft.current, content }
      schedule(draft.current)
    },
    onSlash: setSlash,
    slashKeys,
  })

  /** Saves what was typed last and returns the note as stored, so undo brings back what was on screen. */
  const settle = async (): Promise<Note> => {
    await flush()
    return useNoteStore.getState().items.find((n) => n.id === note.id) ?? note
  }

  const confirmDelete = async () => {
    setConfirming(false)
    try {
      const latest = await settle()
      cancel()
      // Leave first: the page must not render a missing note for a moment after the delete.
      navigate('/notes')
      await deleteNoteWithUndo(latest, (id) => navigate(`/notes/${id}`))
    } catch (e) {
      useUiStore.getState().showToast(e instanceof Error ? e.message : 'Catatan gagal dihapus.')
    }
  }

  const toggleArchive = async () => {
    const latest = await settle()
    if (latest.archivedAt) return void (await unarchiveNote(latest).catch(() => useUiStore.getState().showToast('Catatan gagal dipulihkan.')))
    navigate('/notes')
    await archiveNoteWithUndo(latest)
  }

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const closePanel = () => {
    setPanelOpen(false)
    document.getElementById(PANEL_TOGGLE_ID)?.focus()
  }

  const panel = (
    <ViewPanel
      editor={editor}
      tags={meta.tags}
      tagPool={tagPool}
      projectId={meta.projectId}
      pinned={meta.pinned}
      onTags={(tags) => change({ tags })}
      onProject={(projectId) => change({ projectId })}
      onPinned={(pinned) => change({ pinned })}
    />
  )

  return (
    <div>
      <NoteTopBar
        ref={backRef}
        title={meta.title}
        editor={editor}
        status={status}
        savedAt={savedAt ?? note.updatedAt}
        onRetry={() => void retry()}
        pinned={meta.pinned}
        archived={Boolean(note.archivedAt)}
        onTogglePin={() => change({ pinned: !meta.pinned })}
        onToggleArchive={() => void toggleArchive()}
        onDelete={() => setConfirming(true)}
        onSaveTemplate={() => setSavingTemplate(true)}
        panelOpen={isWide ? panelOpen : drawerOpen}
        panelId={isWide ? PANEL_ID : undefined}
        onTogglePanel={() => (isWide ? setPanelOpen(!panelOpen) : setDrawerOpen(true))}
      />

      <div className="flex items-start gap-6 pb-10 lg:p-6">
        <div className="min-w-0 flex-1">
          <NotePaper editor={editor} title={meta.title} createdAt={note.createdAt} titleRef={titleRef} onTitle={(title) => change({ title })} />
        </div>
        {isWide && panelOpen && (
          <aside id={PANEL_ID} aria-label="Tampilan" className="sticky top-[4.25rem] max-h-[calc(100dvh-8rem)] w-80 shrink-0 overflow-y-auto rounded-card border bg-surface p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-md font-bold">Tampilan</h2>
              <IconButton icon={X} label="Tutup panel Tampilan" onClick={closePanel} />
            </div>
            {panel}
          </aside>
        )}
      </div>

      {!isWide && (
        <SheetPanel open={drawerOpen} onClose={closeDrawer} label="Tampilan">
          {panel}
        </SheetPanel>
      )}
      {editor && <EditorToolbar editor={editor} />}
      {editor && <SlashMenu editor={editor} state={slash} keyHandler={slashKeys} />}
      <SaveTemplateDialog open={savingTemplate} note={draft.current} onClose={() => setSavingTemplate(false)} />
      <ConfirmDeleteDialog open={confirming} title={meta.title} onConfirm={() => void confirmDelete()} onCancel={() => setConfirming(false)} />
    </div>
  )
}

interface NoteEditorProps {
  noteId: string | undefined
}

/** The note in the URL as a page, or the not-found state. */
export function NoteEditor({ noteId }: NoteEditorProps) {
  const { note, save } = useNote(noteId)
  if (!note) return <NoteMissing />
  return <NoteEditorForm key={note.id} note={note} save={save} />
}
