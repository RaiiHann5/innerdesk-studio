import { Plus, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { controlClass } from '@/components/ui/Field'
import type { PersonRow } from './itemDraft'

interface PeopleEditorProps {
  legend: string
  rows: PersonRow[]
  onChange: (rows: PersonRow[]) => void
  namePlaceholder: string
  detailLabel: string
  detailPlaceholder: string
  addLabel: string
}

/** A list of people, each with a name and one more thing (a character, a job). Rows are added and removed one at a time. */
export function PeopleEditor({ legend, rows, onChange, namePlaceholder, detailLabel, detailPlaceholder, addLabel }: PeopleEditorProps) {
  const set = (index: number, patch: Partial<PersonRow>) => onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      {rows.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input aria-label={`${legend}: nama ${i + 1}`} value={row.name} onChange={(e) => set(i, { name: e.target.value })} placeholder={namePlaceholder} className={controlClass} />
          <input aria-label={`${legend}: ${detailLabel} ${i + 1}`} value={row.detail} onChange={(e) => set(i, { detail: e.target.value })} placeholder={detailPlaceholder} className={controlClass} />
          <IconButton icon={X} label={`Hapus ${legend.toLowerCase()} ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <Button variant="ghost" onClick={() => onChange([...rows, { name: '', detail: '' }])} className="h-7 px-2 text-sm">
        <Plus aria-hidden />
        {addLabel}
      </Button>
    </fieldset>
  )
}
