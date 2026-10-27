import { cn } from '@/lib/cn'

interface TagFilterProps {
  tags: string[]
  value: string | null
  onChange: (tag: string | null) => void
  className?: string
}

interface ChipProps {
  label: string
  active: boolean
  onClick: () => void
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-7 shrink-0 rounded-control border px-2.5 text-sm font-medium transition-colors duration-fast',
        active ? 'border-transparent bg-accent-soft text-accent-text' : 'bg-surface text-muted hover:border-faint hover:text-ink',
      )}
    >
      {label}
    </button>
  )
}

export function TagFilter({ tags, value, onChange, className }: TagFilterProps) {
  if (tags.length === 0) return null
  return (
    <div role="group" aria-label="Filter tag" className={cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 py-1', className)}>
      <Chip label="Semua" active={value === null} onClick={() => onChange(null)} />
      {tags.map((tag) => (
        <Chip key={tag} label={tag} active={value === tag} onClick={() => onChange(value === tag ? null : tag)} />
      ))}
    </div>
  )
}
