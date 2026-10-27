import { useEffect, useRef, useState, type MutableRefObject } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/cn'
import type { SlashMenuState } from './extensions/slashCommand'

const MENU_HEIGHT = 288
const GAP = 6

interface SlashMenuProps {
  editor: Editor
  state: SlashMenuState | null
  /** The editor asks this first for every key while the menu is open. SlashMenu fills it in. */
  keyHandler: MutableRefObject<(event: KeyboardEvent) => boolean>
}

const optionId = (id: string) => `slash-option-${id}`

export function SlashMenu({ editor, state, keyHandler }: SlashMenuProps) {
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const items = state?.items
  const active = items && items.length > 0 ? Math.min(index, items.length - 1) : -1

  useEffect(() => setIndex(0), [items])

  useEffect(() => {
    keyHandler.current = (event) => {
      if (!state || state.items.length === 0) return false
      const count = state.items.length
      if (event.key === 'ArrowDown') setIndex((active + 1) % count)
      else if (event.key === 'ArrowUp') setIndex((active - 1 + count) % count)
      else if (event.key === 'Enter' || event.key === 'Tab') state.choose(state.items[active])
      else return false
      return true
    }
  })

  // The caret stays in the text, so screen readers follow the highlighted option through aria-activedescendant.
  useEffect(() => {
    const dom = editor.view.dom
    if (!items || active < 0) {
      dom.removeAttribute('aria-activedescendant')
      dom.removeAttribute('aria-controls')
      return
    }
    dom.setAttribute('aria-activedescendant', optionId(items[active].id))
    dom.setAttribute('aria-controls', 'slash-menu')
    listRef.current?.querySelector(`#${optionId(items[active].id)}`)?.scrollIntoView({ block: 'nearest' })
    return () => {
      dom.removeAttribute('aria-activedescendant')
      dom.removeAttribute('aria-controls')
    }
  }, [editor, items, active])

  if (!state || !state.rect) return null
  const { rect } = state
  const below = rect.bottom + GAP + MENU_HEIGHT <= window.innerHeight
  const style = below ? { top: rect.bottom + GAP, left: rect.left } : { bottom: window.innerHeight - rect.top + GAP, left: rect.left }

  return createPortal(
    <div
      id="slash-menu"
      ref={listRef}
      role="listbox"
      aria-label="Sisipkan blok"
      style={{ position: 'fixed', maxHeight: MENU_HEIGHT, ...style }}
      className="z-50 w-64 overflow-y-auto rounded-card border bg-surface p-1"
    >
      {state.items.length === 0 ? (
        <p role="status" className="px-3 py-2 text-sm text-muted">
          Tidak ada blok yang cocok
        </p>
      ) : (
        state.items.map((block, i) => (
          <button
            key={block.id}
            id={optionId(block.id)}
            type="button"
            role="option"
            aria-selected={i === active}
            tabIndex={-1}
            // Choosing must not move focus out of the editor.
            onMouseDown={(e) => {
              e.preventDefault()
              state.choose(block)
            }}
            onMouseEnter={() => setIndex(i)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left text-sm transition-colors duration-fast',
              i === active ? 'bg-accent-soft text-accent-text' : 'text-ink',
            )}
          >
            <block.icon size={18} aria-hidden className="shrink-0" />
            <span className="flex-1">{block.label}</span>
            <span aria-hidden className="font-mono text-xs text-muted">
              {block.shortcut}
            </span>
          </button>
        ))
      )}
    </div>,
    document.body,
  )
}
