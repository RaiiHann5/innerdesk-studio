import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { useEditorState, type Editor } from '@tiptap/react'
import { Archive, ArrowCounterClockwise, ArrowLeft, ArrowUUpLeft, ArrowUUpRight, FilePlus, PushPin, PushPinSlash, SlidersHorizontal, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { Pill } from '@/components/ui/Pill'
import { SaveStatus } from './SaveStatus'
import type { SaveStatus as Status } from './hooks/useAutosave'

const FOCUS = 'outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-text'

interface NoteTopBarProps {
  title: string
  editor: Editor | null
  status: Status
  savedAt: string
  onRetry: () => void
  pinned: boolean
  archived: boolean
  onTogglePin: () => void
  onToggleArchive: () => void
  onDelete: () => void
  onSaveTemplate: () => void
  /** Whether the Tampilan panel is showing, as a column on wide screens or as the drawer below lg. */
  panelOpen: boolean
  panelId?: string
  onTogglePanel: () => void
}

export const PANEL_TOGGLE_ID = 'note-view-toggle'

/** Breadcrumb and back arrow, undo and redo, save status, the Tampilan button and the note's menu. */
export const NoteTopBar = forwardRef<HTMLAnchorElement, NoteTopBarProps>(function NoteTopBar(
  { title, editor, status, savedAt, onRetry, pinned, archived, onTogglePin, onToggleArchive, onDelete, onSaveTemplate, panelOpen, panelId, onTogglePanel },
  backRef,
) {
  const history = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ undo: e?.can().undo() ?? false, redo: e?.can().redo() ?? false }),
  })
  const name = title.trim() || 'Tanpa judul'

  const items: MenuItem[] = [
    { label: pinned ? 'Lepas sematan' : 'Sematkan', icon: pinned ? PushPinSlash : PushPin, onSelect: onTogglePin },
    { label: archived ? 'Pulihkan' : 'Arsipkan', icon: archived ? ArrowCounterClockwise : Archive, onSelect: onToggleArchive },
    { label: 'Jadikan template', icon: FilePlus, onSelect: onSaveTemplate },
    { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: onDelete },
  ]

  return (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b bg-bg px-4 py-2.5 md:px-6">
      <Link ref={backRef} to="/notes" aria-label="Kembali ke daftar catatan" className={`flex size-8 shrink-0 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink lg:hidden ${FOCUS}`}>
        <ArrowLeft size={18} aria-hidden />
      </Link>
      <nav aria-label="Jejak halaman" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2 text-sm">
          <li className="hidden shrink-0 items-center gap-2 lg:flex">
            <Link to="/notes" className={`rounded-chip text-muted transition-colors duration-fast hover:text-ink ${FOCUS}`}>
              Catatan
            </Link>
            <span aria-hidden className="text-faint">
              /
            </span>
          </li>
          <li aria-current="page" className="min-w-0 truncate font-medium text-ink">
            {name}
          </li>
          {archived && (
            <li className="shrink-0">
              <Pill>Diarsipkan</Pill>
            </li>
          )}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton icon={ArrowUUpLeft} label="Urungkan" disabled={!history?.undo} onClick={() => editor?.chain().focus().undo().run()} className="disabled:pointer-events-none disabled:opacity-40" />
        <IconButton icon={ArrowUUpRight} label="Ulangi" disabled={!history?.redo} onClick={() => editor?.chain().focus().redo().run()} className="disabled:pointer-events-none disabled:opacity-40" />
      </div>
      {/* On a phone the status only takes room when there is something to act on: a failed save. */}
      <div className={status === 'error' ? 'shrink-0' : 'hidden shrink-0 sm:block'}>
        <SaveStatus status={status} savedAt={savedAt} onRetry={onRetry} />
      </div>
      <Button id={PANEL_TOGGLE_ID} variant="secondary" aria-expanded={panelOpen} aria-controls={panelId} aria-haspopup={panelId ? undefined : 'dialog'} onClick={onTogglePanel}>
        <SlidersHorizontal aria-hidden />
        <span className="hidden sm:inline">Tampilan</span>
        <span className="sr-only sm:hidden">Tampilan</span>
      </Button>
      <Menu label={`Menu untuk ${name}`} items={items} />
    </div>
  )
})

