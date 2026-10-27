import type { MutableRefObject } from 'react'
import { useEditor } from '@tiptap/react'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import TextAlign from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extensions'
import StarterKit from '@tiptap/starter-kit'
import type { NoteContent } from '@/types/domain'
import { MarkdownLink } from '../extensions/markdownLink'
import { SlashCommand, type SlashMenuState } from '../extensions/slashCommand'
import { proseClass } from '../proseClass'

interface UseNoteEditorOptions {
  content: NoteContent
  onContent: (content: NoteContent) => void
  onSlash: (state: SlashMenuState | null) => void
  slashKeys: MutableRefObject<(event: KeyboardEvent) => boolean>
}

/** The TipTap instance of one note: history, underline and links come with StarterKit, alignment and task lists are added. */
export function useNoteEditor({ content, onContent, onSlash, slashKeys }: UseNoteEditorOptions) {
  return useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      MarkdownLink,
      Placeholder.configure({ placeholder: 'Mulai menulis, atau ketik / untuk memilih blok' }),
      SlashCommand.configure({ onChange: onSlash, onKeyDown: (event) => slashKeys.current(event) }),
    ],
    content,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Isi catatan', class: proseClass },
    },
    onUpdate: ({ editor }) => onContent(editor.getJSON() as NoteContent),
  })
}
