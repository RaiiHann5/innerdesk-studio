import { useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'

const ITEM_MAX = 120
const COUNT_MAX = 8

interface GratitudeFieldProps {
  value: string[]
  onChange: (value: string[]) => void
}

/** Short lines of thanks, added one at a time with Enter or the button. */
export function GratitudeField({ value, onChange }: GratitudeFieldProps) {
  const [text, setText] = useState('')
  const full = value.length >= COUNT_MAX
  const canAdd = text.trim() !== '' && !full

  const add = () => {
    if (!canAdd) return
    onChange([...value, text.trim()])
    setText('')
  }

  return (
    <div>
      <div className="flex gap-2">
        <label htmlFor="gratitude-input" className="sr-only">
          Sesuatu yang kamu syukuri
        </label>
        <input
          id="gratitude-input"
          type="text"
          value={text}
          maxLength={ITEM_MAX}
          disabled={full}
          placeholder={full ? 'Sudah penuh, cukup untuk hari ini' : 'Sesuatu yang kamu syukuri…'}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          className={cn(controlClass, 'h-10')}
        />
        <Button variant="primary" onClick={add} disabled={!canAdd} className="h-10 px-4">
          <Plus size={14} weight="bold" aria-hidden />
          Tambah
        </Button>
      </div>

      {value.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Belum ada yang disyukuri. Hal kecil juga boleh.</p>
      ) : (
        <ul aria-label="Yang disyukuri hari ini" className="mt-3 space-y-1.5">
          {value.map((item, index) => (
            <li key={`${index}:${item}`} className="group flex items-start gap-3 rounded-control bg-sunken py-1.5 pl-3 pr-1.5">
              <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0 flex-1 break-words py-0.5 text-base">{item}</span>
              <button
                type="button"
                aria-label={`Hapus: ${item}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
                className="grid size-6 shrink-0 place-items-center rounded-chip text-muted transition-colors duration-fast hover:bg-surface hover:text-ink"
              >
                <X size={12} weight="bold" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
