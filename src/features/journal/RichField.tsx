import { useEditor, EditorContent } from '@tiptap/react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import type { Editor } from '@tiptap/react'
import type { EditorDoc } from '@/types/domain'
import { EditorToolbar } from './EditorToolbar'

interface RichFieldProps {
  value: EditorDoc
  placeholder: string
  label: string
  onChange: (doc: EditorDoc, text: string) => void
  onReady?: (editor: Editor) => void
}

/** The highlights box: a bordered writing area with a formatting bar. It keeps its own text, so the parent keys it by day. */
export function RichField({ value, placeholder, label, onChange, onReady }: RichFieldProps) {
  const editor = useEditor({
    extensions: [
      // v3's kit also brings link, underline and a trailing empty paragraph; the journal's saved documents have none of them.
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
        strike: false,
        link: false,
        underline: false,
        trailingNode: false,
      }),
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, class: 'journal-doc min-h-[9rem] outline-none' },
    },
    onCreate: ({ editor: e }) => onReady?.(e),
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as EditorDoc, e.getText()),
  })

  return (
    <div className="rounded-control border bg-surface transition-colors duration-fast focus-within:border-ink hover:border-faint focus-within:hover:border-ink">
      {editor && (
        <div className="border-b px-1.5 py-1">
          <EditorToolbar editor={editor} />
        </div>
      )}
      <div className="cursor-text px-3 py-2.5" onClick={() => editor?.commands.focus()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
