import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { Copy, Globe, LinkSimple, TextB, TextH, TextItalic, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { useUiStore } from '@/stores/ui'
import { applyLink, LinkForm } from './LinkForm'
import { searchUrl } from './lib/links'

interface ToolButtonProps {
  icon: Icon
  label: string
  active?: boolean
  onClick: () => void
}

function ToolButton({ icon: Glyph, label, active, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      // Keeps the text selection while the button is pressed, so the action applies to it.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-control transition-colors duration-fast',
        active ? 'bg-accent-soft text-accent-text' : 'text-ink hover:bg-sunken',
      )}
    >
      <Glyph size={18} weight={active ? 'bold' : 'regular'} aria-hidden />
    </button>
  )
}

const selectedText = (editor: Editor) => {
  const { from, to } = editor.state.selection
  return editor.state.doc.textBetween(from, to, ' ')
}

/**
 * The small menu that floats over selected text: Tebal, Miring, Tautan, Judul, then Salin teks and
 * Cari di web. Placement is floating-ui's, through TipTap's BubbleMenu. There is no fixed toolbar.
 */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const [linking, setLinking] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      link: e.isActive('link'),
      heading: e.isActive('heading', { level: 2 }),
      href: (e.getAttributes('link').href as string | undefined) ?? '',
    }),
  })

  // A new selection starts over with the buttons, not with a half-filled link form.
  useEffect(() => {
    const reset = () => setLinking(false)
    editor.on('selectionUpdate', reset)
    return () => void editor.off('selectionUpdate', reset)
  }, [editor])

  // Alt+F10 moves focus from the text to the menu, since it floats outside the tab order of the text.
  useEffect(() => {
    const dom = editor.view.dom
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (!(e.altKey && e.key === 'F10')) return
      const first = barRef.current?.querySelector<HTMLButtonElement | HTMLInputElement>('button, input')
      if (!first) return
      e.preventDefault()
      first.focus()
    }
    dom.addEventListener('keydown', onKey)
    return () => dom.removeEventListener('keydown', onKey)
  }, [editor])

  const run = (command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => command(editor.chain().focus()).run()
  const toast = (message: string) => useUiStore.getState().showToast(message)

  const copy = () => {
    navigator.clipboard.writeText(selectedText(editor)).then(
      () => toast('Teks disalin.'),
      () => toast('Teks gagal disalin.'),
    )
  }

  const search = () => window.open(searchUrl(selectedText(editor)), '_blank', 'noopener,noreferrer')

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      editor.commands.focus()
      return
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const buttons = Array.from(barRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (index === -1 || buttons.length === 0) return
    e.preventDefault()
    buttons[(index + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length].focus()
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'top' }}
      shouldShow={({ state, view, element }) =>
        !state.selection.empty && (view.hasFocus() || element.contains(document.activeElement)) && !editor.isActive('codeBlock')
      }
    >
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Format teks"
        onKeyDown={onKeyDown}
        className="flex items-center gap-0.5 rounded-card border bg-surface p-1 shadow-lift"
      >
        {linking ? (
          <LinkForm
            initial={active.href}
            hasLink={active.link}
            onSubmit={(address) => {
              applyLink(editor, address)
              setLinking(false)
            }}
            onRemove={() => {
              applyLink(editor, '')
              setLinking(false)
            }}
            onCancel={() => {
              setLinking(false)
              editor.commands.focus()
            }}
          />
        ) : (
          <>
            <ToolButton icon={TextB} label="Tebal" active={active.bold} onClick={() => run((c) => c.toggleBold())} />
            <ToolButton icon={TextItalic} label="Miring" active={active.italic} onClick={() => run((c) => c.toggleItalic())} />
            <ToolButton icon={LinkSimple} label="Tautan" active={active.link} onClick={() => setLinking(true)} />
            <ToolButton icon={TextH} label="Judul" active={active.heading} onClick={() => run((c) => c.toggleHeading({ level: 2 }))} />
            <span role="separator" aria-orientation="vertical" className="mx-1 h-5 w-px bg-line" />
            <ToolButton icon={Copy} label="Salin teks" onClick={copy} />
            <ToolButton icon={Globe} label="Cari di web" onClick={search} />
          </>
        )}
      </div>
    </BubbleMenu>
  )
}
