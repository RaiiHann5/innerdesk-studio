import { Lightbulb, Tray } from '@phosphor-icons/react'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import type { BrainstormSession } from '@/types/domain'
import { ideaCount } from './lib/sessions'

interface SessionRailProps {
  sessions: BrainstormSession[]
  selectedId: string | undefined
  archived: boolean
  archivedCount: number
  onSelect: (id: string) => void
  onToggleArchived: (archived: boolean) => void
}

/** The list of sessions. Stacked above the workspace on a phone, a column beside it on a wide screen. */
export function SessionRail({ sessions, selectedId, archived, archivedCount, onSelect, onToggleArchived }: SessionRailProps) {
  return (
    <nav aria-label="Daftar sesi brainstorm" className="min-w-0 space-y-3">
      <SegmentedControl<'aktif' | 'arsip'>
        label="Tampilkan sesi"
        fullWidth
        value={archived ? 'arsip' : 'aktif'}
        onChange={(value) => onToggleArchived(value === 'arsip')}
        options={[
          { value: 'aktif', label: 'Aktif' },
          { value: 'arsip', label: `Arsip${archivedCount > 0 ? ` (${archivedCount})` : ''}` },
        ]}
      />
      {sessions.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted">{archived ? 'Belum ada sesi yang diarsipkan.' : 'Belum ada sesi.'}</p>
      ) : (
        <ul className="max-h-60 space-y-1 overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
          {sessions.map((session) => {
            const selected = session.id === selectedId
            const RowIcon = session.inbox ? Tray : Lightbulb
            return (
              <li key={session.id}>
                <button
                  type="button"
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(session.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-control border px-2.5 py-2 text-left transition-colors duration-fast',
                    selected ? 'border-accent-text/40 bg-accent-soft' : 'border-transparent hover:bg-sunken',
                  )}
                >
                  <RowIcon size={18} aria-hidden className={cn('shrink-0', selected ? 'text-accent-text' : 'text-muted')} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', selected ? 'font-semibold text-accent-text' : 'font-medium')}>{session.title}</span>
                    <span className="block truncate text-xs text-muted">{ideaCount(session.ideas.length)}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
