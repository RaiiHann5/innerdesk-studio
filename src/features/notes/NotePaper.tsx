import { useLayoutEffect, type RefObject } from 'react'
import { EditorContent, type Editor } from '@tiptap/react'
import { fmt } from '@/lib/date'
import { useSettingsStore } from '@/stores/settings'
import { docStyle } from './lib/viewPrefs'

interface NotePaperProps {
  editor: Editor | null
  title: string
  createdAt: string
  titleRef: RefObject<HTMLTextAreaElement>
  onTitle: (title: string) => void
}

/**
 * The sheet: a centered page with the title as a large heading and the TipTap body under it.
 * View preferences reach the text as CSS variables on the sheet, so changing one repaints without re-rendering the editor.
 */
export function NotePaper({ editor, title, createdAt, titleRef, onTitle }: NotePaperProps) {
  const font = useSettingsStore((s) => s.noteFont)
  const size = useSettingsStore((s) => s.noteSize)
  const spacing = useSettingsStore((s) => s.noteSpacing)

  // The title grows with its text instead of scrolling sideways.
  useLayoutEffect(() => {
    const el = titleRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title, titleRef])

  return (
    <article
      aria-label="Halaman catatan"
      style={docStyle({ font, size, spacing })}
      className="mx-auto w-full max-w-[720px] border bg-surface px-5 py-8 sm:px-12 sm:py-12 max-lg:rounded-none max-lg:border-x-0 lg:rounded-card"
    >
      <textarea
        ref={titleRef}
        rows={1}
        value={title}
        onChange={(e) => onTitle(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (!editor) return
          // Focus the field itself first: TipTap defers its own focus, and a fast typist would otherwise still be typing into the title.
          editor.view.dom.focus()
          editor.commands.focus('start')
        }}
        aria-label="Judul catatan"
        placeholder="Tanpa judul"
        className="block w-full resize-none overflow-hidden bg-transparent font-display text-xl font-bold tracking-tight text-ink outline-none placeholder:text-muted"
      />
      <p className="mt-2 text-xs tabular-nums text-muted">
        Dibuat <time dateTime={createdAt}>{fmt(createdAt, 'd MMM yyyy')}</time>
      </p>
      <div className="mt-8">
        <EditorContent editor={editor} />
      </div>
    </article>
  )
}
