import { Warning } from '@phosphor-icons/react'
import { fmt } from '@/lib/date'
import type { SaveStatus as Status } from './hooks/useAutosave'

interface SaveStatusProps {
  status: Status
  /** ISO time of the last save, or the note's own updatedAt before anything was saved in this session. */
  savedAt: string
  onRetry: () => void
}

export function SaveStatus({ status, savedAt, onRetry }: SaveStatusProps) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs tabular-nums text-muted">
      {status === 'saving' && 'Menyimpan...'}
      {(status === 'saved' || status === 'idle') && (
        <>
          Tersimpan <time dateTime={savedAt}>{fmt(savedAt, 'HH.mm')}</time>
        </>
      )}
      {status === 'error' && (
        <>
          <Warning size={14} weight="fill" aria-hidden className="text-ink" />
          <span className="text-ink">Gagal menyimpan</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-control px-1 font-medium text-accent-text underline underline-offset-2 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Coba lagi
          </button>
        </>
      )}
    </p>
  )
}
