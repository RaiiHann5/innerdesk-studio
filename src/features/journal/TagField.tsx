import { useState } from 'react'
import { X } from '@phosphor-icons/react'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { SUGGESTED_TAGS, TAG_MAX_LENGTH, addTag, hasTag, removeTag } from './lib/tags'

interface TagFieldProps {
  value: string[]
  onChange: (value: string[]) => void
}

const chip = 'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors duration-fast'

/** The usual topics as toggles, plus any tag the person typed. Typed tags show as chips that can be removed. */
export function TagField({ value, onChange }: TagFieldProps) {
  const [text, setText] = useState('')
  const custom = value.filter((tag) => !SUGGESTED_TAGS.some((s) => s.label.toLocaleLowerCase('id') === tag.toLocaleLowerCase('id')))

  const toggle = (tag: string) => onChange(hasTag(value, tag) ? removeTag(value, tag) : addTag(value, tag))

  return (
    <div>
      <div role="group" aria-label="Tag hari ini" className="flex flex-wrap gap-2">
        {SUGGESTED_TAGS.map(({ label, icon: IconComponent }) => {
          const pressed = hasTag(value, label)
          return (
            <button
              key={label}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(label)}
              className={cn(chip, pressed ? 'border-ink bg-ink font-medium text-bg' : 'bg-surface text-muted hover:border-faint hover:text-ink')}
            >
              <IconComponent size={14} weight={pressed ? 'fill' : 'regular'} aria-hidden />
              {label}
            </button>
          )
        })}
        {custom.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-label={`Hapus tag ${tag}`}
            onClick={() => onChange(removeTag(value, tag))}
            className={cn(chip, 'border-ink bg-ink pr-2.5 font-medium text-bg')}
          >
            {tag}
            <X size={12} weight="bold" aria-hidden />
          </button>
        ))}
      </div>
      <div className="mt-3 max-w-xs">
        <label htmlFor="tag-input" className="sr-only">
          Tag lain
        </label>
        <input
          id="tag-input"
          type="text"
          value={text}
          maxLength={TAG_MAX_LENGTH}
          placeholder="Tag lain, lalu Enter"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            onChange(addTag(value, text))
            setText('')
          }}
          className={controlClass}
        />
      </div>
    </div>
  )
}
