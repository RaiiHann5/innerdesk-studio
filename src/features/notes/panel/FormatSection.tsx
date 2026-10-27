import { useEditorState, type Editor } from '@tiptap/react'
import { TextAlignCenter, TextAlignLeft, TextAlignRight, TextB, TextItalic, TextStrikethrough, TextUnderline } from '@phosphor-icons/react'
import { PanelButton } from './PanelButton'
import { PanelSection } from './PanelSection'

/** Inline marks and alignment, reflecting what is under the cursor or selection. */
export function FormatSection({ editor }: { editor: Editor | null }) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const align = e?.isActive({ textAlign: 'center' }) ? 'center' : e?.isActive({ textAlign: 'right' }) ? 'right' : 'left'
      return {
        bold: e?.isActive('bold') ?? false,
        italic: e?.isActive('italic') ?? false,
        underline: e?.isActive('underline') ?? false,
        strike: e?.isActive('strike') ?? false,
        align,
      }
    },
  })
  const run = (command: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => editor && command(editor.chain().focus()).run()
  const off = !editor

  return (
    <PanelSection title="Format">
      <div role="group" aria-label="Gaya teks" className="grid grid-cols-4 gap-2">
        <PanelButton icon={TextB} label="Tebal" active={state?.bold} disabled={off} onClick={() => run((c) => c.toggleBold())} />
        <PanelButton icon={TextItalic} label="Miring" active={state?.italic} disabled={off} onClick={() => run((c) => c.toggleItalic())} />
        <PanelButton icon={TextUnderline} label="Garis bawah" active={state?.underline} disabled={off} onClick={() => run((c) => c.toggleUnderline())} />
        <PanelButton icon={TextStrikethrough} label="Coret" active={state?.strike} disabled={off} onClick={() => run((c) => c.toggleStrike())} />
      </div>
      <div role="group" aria-label="Perataan teks" className="grid grid-cols-4 gap-2">
        <PanelButton icon={TextAlignLeft} label="Rata kiri" active={state?.align === 'left'} disabled={off} onClick={() => run((c) => c.setTextAlign('left'))} />
        <PanelButton icon={TextAlignCenter} label="Rata tengah" active={state?.align === 'center'} disabled={off} onClick={() => run((c) => c.setTextAlign('center'))} />
        <PanelButton icon={TextAlignRight} label="Rata kanan" active={state?.align === 'right'} disabled={off} onClick={() => run((c) => c.setTextAlign('right'))} />
      </div>
    </PanelSection>
  )
}
