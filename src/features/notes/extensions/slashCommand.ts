import { Extension } from '@tiptap/react'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'
import { filterBlocks, type Block } from '../lib/blocks'

/** What the slash menu needs to draw itself, handed to React each time the typed query changes. */
export interface SlashMenuState {
  items: Block[]
  rect: DOMRect | null
  choose: (block: Block) => void
}

interface SlashCommandOptions {
  /** Called with the menu state while a slash is being typed, and with null once it ends. */
  onChange: (state: SlashMenuState | null) => void
  /** Gets each key first while the menu is open. Return true to say the key was used. */
  onKeyDown: (event: KeyboardEvent) => boolean
}

const toState = (props: SuggestionProps<Block, Block>): SlashMenuState => ({
  items: props.items,
  rect: props.clientRect?.() ?? null,
  choose: (block) => props.command(block),
})

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: 'slashCommand',

  addOptions() {
    return { onChange: () => undefined, onKeyDown: () => false }
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<Block, Block>({
        editor: this.editor,
        char: '/',
        allow: ({ editor }) => !editor.isActive('codeBlock'),
        items: ({ query }) => filterBlocks(query),
        command: ({ editor, range, props }) => {
          props.apply(editor.chain().focus().deleteRange(range)).run()
        },
        render: () => ({
          onStart: (props) => this.options.onChange(toState(props)),
          onUpdate: (props) => this.options.onChange(toState(props)),
          onKeyDown: ({ event }) => this.options.onKeyDown(event),
          onExit: () => this.options.onChange(null),
        }),
      }),
    ]
  },
})
