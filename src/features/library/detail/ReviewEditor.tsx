import { useEffect } from 'react'
import { EditorContent, useEditor, useEditorState, type Editor } from '@tiptap/react'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import { ListBullets, Quotes, TextB, TextItalic, type Icon } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { excerptFromContent } from '@/features/notes/lib/excerpt'
import type { NoteContent } from '@/types/domain'

const EMPTY: NoteContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/** A review is read like a printed page: serif, a comfortable line length, and nothing but the plain blocks a review needs. */
const reviewProse = [
  'min-h-24 max-w-[62ch] font-serif text-md leading-relaxed text-ink outline-none',
  '[&>*+*]:mt-3 [&_strong]:font-semibold',
  '[&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-4 [&_blockquote]:text-muted',
  '[&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li>p]:mt-0 [&_li+li]:mt-1',
  '[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left',
  '[&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted',
  '[&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
].join(' ')

function Tool({ icon: Glyph, label, active, onClick }: { icon: Icon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn('flex size-8 items-center justify-center rounded-control transition-colors duration-fast', active ? 'bg-accent-soft text-accent-text' : 'text-muted hover:bg-sunken hover:text-ink')}
    >
      <Glyph size={18} weight={active ? 'bold' : 'regular'} aria-hidden />
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ bold: e?.isActive('bold') ?? false, italic: e?.isActive('italic') ?? false, quote: e?.isActive('blockquote') ?? false, list: e?.isActive('bulletList') ?? false }),
  })
  return (
    <div role="toolbar" aria-label="Format ulasan" className="mb-2 flex gap-0.5 border-b pb-2">
      <Tool icon={TextB} label="Tebal" active={active.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <Tool icon={TextItalic} label="Miring" active={active.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <Tool icon={Quotes} label="Kutipan" active={active.quote} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
      <Tool icon={ListBullets} label="Daftar" active={active.list} onClick={() => editor.chain().focus().toggleBulletList().run()} />
    </div>
  )
}

interface ReviewEditorProps {
  content: NoteContent | undefined
  editable: boolean
  label: string
  onChange?: (content: NoteContent, excerpt: string) => void
}

/** The review as a small TipTap editor. Loaded on demand, since a page that only shows a rating has no need of it. */
export default function ReviewEditor({ content, editable, label, onChange }: ReviewEditorProps) {
  const editor = useEditor({
    extensions: [
      // No headings, code or links: a review is paragraphs, emphasis, a quote and a list.
      StarterKit.configure({ heading: false, codeBlock: false, horizontalRule: false, link: false }),
      Placeholder.configure({ placeholder: 'Apa yang kamu rasakan? Apa yang paling menempel?' }),
    ],
    content: content ?? EMPTY,
    editable,
    editorProps: { attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': label, class: reviewProse } },
    onUpdate: ({ editor: e }) => {
      const json = e.getJSON() as NoteContent
      onChange?.(json, excerptFromContent(json, 160))
    },
  })

  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  if (!editor) return null
  return (
    <div>
      {editable && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
