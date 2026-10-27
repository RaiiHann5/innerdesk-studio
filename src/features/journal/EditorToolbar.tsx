import type { Editor } from '@tiptap/react'
import { useEditorState } from '@tiptap/react'
import { ListBullets, ListChecks, Quotes, TextB, TextItalic, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'

interface Tool {
  label: string
  icon: Icon
  active: (editor: Editor) => boolean
  run: (editor: Editor) => void
}

const TOOLS: Tool[] = [
  { label: 'Tebal', icon: TextB, active: (e) => e.isActive('bold'), run: (e) => e.chain().focus().toggleBold().run() },
  { label: 'Miring', icon: TextItalic, active: (e) => e.isActive('italic'), run: (e) => e.chain().focus().toggleItalic().run() },
  { label: 'Kutipan', icon: Quotes, active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Daftar poin', icon: ListBullets, active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Daftar centang', icon: ListChecks, active: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
]

/** Formatting buttons, for people who do not type markdown shortcuts. They never take focus out of the text. */
export function EditorToolbar({ editor }: { editor: Editor }) {
  const activeLabels = useEditorState({
    editor,
    selector: ({ editor: e }) => TOOLS.filter((tool) => tool.active(e)).map((tool) => tool.label).join('|'),
  })
  const active = new Set(activeLabels.split('|'))

  return (
    <div role="toolbar" aria-label="Pemformatan teks" className="flex gap-0.5">
      {TOOLS.map(({ label, icon: IconComponent, run }) => {
        const pressed = active.has(label)
        return (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            // Keeps the selection in the editor while the button is pressed.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => run(editor)}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-control text-muted transition-colors duration-fast hover:bg-sunken hover:text-ink',
              pressed && 'bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text',
            )}
          >
            <IconComponent size={18} aria-hidden />
          </button>
        )
      })}
    </div>
  )
}
