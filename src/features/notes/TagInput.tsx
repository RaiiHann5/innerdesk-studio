import { useId, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { X } from '@phosphor-icons/react'
import { addTag, suggestTags } from './lib/tags'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  /** Every tag in use across notes, most used first. */
  suggestions: string[]
}

export function TagInput({ tags, onChange, suggestions }: TagInputProps) {
  const listId = useId()
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [highlight, setHighlight] = useState(-1)
  const [dismissed, setDismissed] = useState(false)

  const options = useMemo(() => suggestTags(suggestions, tags, text), [suggestions, tags, text])
  const open = focused && !dismissed && options.length > 0
  const activeOption = open && highlight >= 0 && highlight < options.length ? highlight : -1

  const commit = (raw: string) => {
    const next = addTag(tags, raw)
    if (next !== tags) onChange(next)
    setText('')
    setHighlight(-1)
  }

  const onText = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setHighlight(-1)
    setDismissed(false)
    if (!value.includes(',')) return setText(value)
    // A comma ends a tag, also when several are pasted at once.
    const parts = value.split(',')
    const rest = parts.pop() ?? ''
    onChange(parts.reduce(addTag, tags))
    setText(rest)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      commit(activeOption >= 0 ? options[activeOption] : text)
    } else if (e.key === 'Backspace' && text === '' && tags.length > 0) {
      e.preventDefault()
      onChange(tags.slice(0, -1))
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault()
      setHighlight((activeOption + 1) % options.length)
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault()
      setHighlight((activeOption - 1 + options.length) % options.length)
    } else if (e.key === 'Escape' && (open || text)) {
      // First Escape closes the suggestions, the next one throws away what was typed.
      e.preventDefault()
      if (open) setDismissed(true)
      else setText('')
    }
  }

  return (
    <div className="relative min-w-0">
      <div className="flex flex-wrap items-center gap-1 rounded-control focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent">
        <ul role="list" aria-label="Tag catatan" className="contents">
          {tags.map((tag) => (
            <li key={tag} className="flex h-7 items-center gap-0.5 rounded-control bg-sunken pl-2 text-sm text-ink">
              {tag}
              <button
                type="button"
                aria-label={`Hapus tag ${tag}`}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="flex size-6 items-center justify-center rounded-control text-muted outline-none hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <X size={12} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <input
          type="text"
          role="combobox"
          aria-label="Tambah tag"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeOption >= 0 ? `${listId}-${activeOption}` : undefined}
          value={text}
          onChange={onText}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (text.trim()) commit(text)
          }}
          placeholder={tags.length === 0 ? 'Tambah tag' : ''}
          className="h-7 w-28 min-w-0 bg-transparent px-1 text-sm outline-none placeholder:text-muted"
        />
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="Saran tag" className="absolute left-0 top-full z-20 mt-1 w-48 rounded-card border bg-surface p-1">
          {options.map((tag, i) => (
            <li
              key={tag}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeOption}
              // Picking must not blur the input first, or the half-typed text would be added as its own tag.
              onMouseDown={(e) => {
                e.preventDefault()
                commit(tag)
              }}
              className={`cursor-pointer rounded-control px-2 py-1 text-sm ${i === activeOption ? 'bg-accent-soft text-accent-text' : 'text-ink hover:bg-sunken'}`}
            >
              {tag}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
