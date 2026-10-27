import { useState, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { formatMoney, parseMoney } from '@/lib/money'
import { Amount } from './Amount'

interface LimitEditorProps {
  name: string
  limitMinor: number
  onSave: (limitMinor: number) => Promise<void>
}

/** The limit as a button; one click turns it into a field. Enter saves, Esc cancels. */
export function LimitEditor({ name, limitMinor, onSave }: LimitEditorProps) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const start = () => {
    setText(formatMoney(limitMinor, 'IDR', { bare: true }))
    setError(null)
    setEditing(true)
  }
  const save = async () => {
    const value = parseMoney(text, 'IDR')
    if (value === null || value <= 0) return setError('Isi batas lebih dari nol. Contoh: 1,5jt.')
    try {
      await onSave(value)
      setEditing(false)
    } catch {
      setError('Gagal menyimpan. Coba lagi.')
    }
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      void save()
    } else if (e.key === 'Escape') {
      e.stopPropagation()
      setEditing(false)
    }
  }

  if (!editing)
    return (
      <button type="button" onClick={start} aria-label={`Ubah batas ${name}`} className="rounded-control px-1.5 py-0.5 hover:bg-sunken">
        <Amount minor={limitMinor} className="font-medium" />
      </button>
    )
  return (
    <span className="flex flex-col items-end gap-1">
      <span className="flex items-center gap-1.5">
        <input autoFocus aria-label={`Batas ${name}`} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} aria-invalid={error ? true : undefined} className={`${controlClass} w-32 text-right tabular-nums`} />
        <Button onClick={() => void save()}>Simpan</Button>
        <Button variant="ghost" onClick={() => setEditing(false)}>
          Batal
        </Button>
      </span>
      {error && (
        <span role="alert" className="text-xs text-status-overdue">
          {error}
        </span>
      )}
    </span>
  )
}
