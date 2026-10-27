import type { Editor } from '@tiptap/react'
import { AppearanceSection } from './panel/AppearanceSection'
import { FormatSection } from './panel/FormatSection'
import { InsertSection } from './panel/InsertSection'
import { NoteSection } from './panel/NoteSection'

type NoteSectionProps = Parameters<typeof NoteSection>[0]

interface ViewPanelProps extends NoteSectionProps {
  editor: Editor | null
}

/** The body of the "Tampilan" panel. The beside-the-paper column and the drawer below lg both render this. */
export function ViewPanel({ editor, ...note }: ViewPanelProps) {
  return (
    <div className="space-y-5">
      <AppearanceSection />
      <FormatSection editor={editor} />
      <InsertSection editor={editor} />
      <NoteSection {...note} />
    </div>
  )
}
