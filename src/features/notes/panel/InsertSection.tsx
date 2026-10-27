import { useState } from 'react'
import { useEditorState, type Editor } from '@tiptap/react'
import { CodeBlock, LinkSimple, ListBullets, ListChecks, Minus, Quotes } from '@phosphor-icons/react'
import { applyLink, LinkForm } from '../LinkForm'
import { PanelButton } from './PanelButton'
import { PanelSection } from './PanelSection'

/** Blocks and links to put into the paper at the cursor. The block buttons toggle, so pressing one twice undoes it. */
export function InsertSection({ editor }: { editor: Editor | null }) {
  const [linking, setLinking] = useState(false)
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      link: e?.isActive('link') ?? false,
      href: (e?.getAttributes('link').href as string | undefined) ?? '',
      bullet: e?.isActive('bulletList') ?? false,
      task: e?.isActive('taskList') ?? false,
      quote: e?.isActive('blockquote') ?? false,
      code: e?.isActive('codeBlock') ?? false,
    }),
  })
  const run = (command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => editor && command(editor.chain().focus()).run()
  const off = !editor

  return (
    <PanelSection title="Sisipkan">
      <div className="grid grid-cols-2 gap-2">
        <PanelButton showLabel icon={LinkSimple} label="Tautan" active={linking || state?.link} disabled={off} onClick={() => setLinking((v) => !v)} />
        <PanelButton showLabel icon={ListBullets} label="Daftar poin" active={state?.bullet} disabled={off} onClick={() => run((c) => c.toggleBulletList())} />
        <PanelButton showLabel icon={ListChecks} label="Daftar centang" active={state?.task} disabled={off} onClick={() => run((c) => c.toggleTaskList())} />
        <PanelButton showLabel icon={Quotes} label="Kutipan" active={state?.quote} disabled={off} onClick={() => run((c) => c.toggleBlockquote())} />
        <PanelButton showLabel icon={CodeBlock} label="Kode" active={state?.code} disabled={off} onClick={() => run((c) => c.toggleCodeBlock())} />
        <PanelButton showLabel icon={Minus} label="Pemisah" disabled={off} onClick={() => run((c) => c.setHorizontalRule())} />
      </div>
      {linking && editor && (
        <LinkForm
          // Re-keyed so the field shows the link under the cursor each time the form opens.
          key={state?.href}
          initial={state?.href ?? ''}
          hasLink={state?.link ?? false}
          inputClassName="min-w-0 flex-1"
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
      )}
    </PanelSection>
  )
}
