import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Editor } from '@tiptap/react'
import { Check, LinkBreak } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { withScheme } from './lib/links'

/**
 * Sets, changes or removes a link at the selection. With nothing selected the address itself is
 * inserted as the linked text, so the button never does nothing.
 */
export function applyLink(editor: Editor, address: string) {
  const chain = editor.chain().focus()
  if (!address) return void chain.extendMarkRange('link').unsetLink().run()
  const href = withScheme(address)
  if (editor.state.selection.empty && !editor.isActive('link')) {
    return void chain.insertContent({ type: 'text', text: address, marks: [{ type: 'link', attrs: { href } }] }).run()
  }
  chain.extendMarkRange('link').setLink({ href }).run()
}

interface LinkFormProps {
  initial: string
  hasLink: boolean
  onSubmit: (address: string) => void
  onRemove: () => void
  onCancel: () => void
  /** Width of the address field. The selection menu wants a fixed one, the side panel wants to fill its row. */
  inputClassName?: string
}

export function LinkForm({ initial, hasLink, onSubmit, onRemove, onCancel, inputClassName = 'w-52' }: LinkFormProps) {
  const [address, setAddress] = useState(initial)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSubmit(address.trim())
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        ref={inputRef}
        type="text"
        inputMode="url"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            e.stopPropagation()
            onCancel()
          }
        }}
        aria-label="Alamat tautan"
        placeholder="https://"
        className={cn('h-8 rounded-control border bg-surface px-2 text-sm', inputClassName)}
      />
      <button
        type="submit"
        aria-label="Terapkan tautan"
        title="Terapkan tautan"
        className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-soft text-accent-text"
      >
        <Check size={18} weight="bold" aria-hidden />
      </button>
      {hasLink && (
        <button
          type="button"
          aria-label="Hapus tautan"
          title="Hapus tautan"
          onClick={onRemove}
          className="flex size-8 shrink-0 items-center justify-center rounded-control text-ink hover:bg-sunken"
        >
          <LinkBreak size={18} aria-hidden />
        </button>
      )}
    </form>
  )
}
