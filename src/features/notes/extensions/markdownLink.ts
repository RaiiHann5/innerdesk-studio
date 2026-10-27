import { Extension, InputRule } from '@tiptap/react'

const SAFE_HREF = /^(https?:\/\/|mailto:|tel:)/i

/** Typing [teks](https://alamat) turns the text into a link, like the other markdown shortcuts. */
export const MarkdownLink = Extension.create({
  name: 'markdownLink',

  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]]+)\]\((\S+)\)$/,
        handler: ({ state, range, match }) => {
          const [, label, href] = match
          const link = state.schema.marks.link
          if (!link || !SAFE_HREF.test(href)) return null
          state.tr.replaceWith(range.from, range.to, state.schema.text(label, [link.create({ href })])).removeStoredMark(link)
          return undefined
        },
      }),
    ]
  },
})
