import { CheckCircle, WarningCircle } from '@phosphor-icons/react'
import type { SaveStatus as Status } from './lib/autosaver'

interface SaveStatusProps {
  status: Status
  onRetry: () => void
}

/** Autosave state in words. The live region is polite and only speaks when the text changes. */
export function SaveStatus({ status, onRetry }: SaveStatusProps) {
  return (
    <p role="status" className="flex items-center gap-1.5 text-xs text-muted">
      {status === 'error' ? (
        <>
          <WarningCircle size={14} aria-hidden className="text-status-overdue" />
          <span>Belum tersimpan.</span>
          <button type="button" onClick={onRetry} className="text-accent-text underline underline-offset-2">
            Coba lagi
          </button>
        </>
      ) : status === 'pending' || status === 'saving' ? (
        <span>Menyimpan…</span>
      ) : status === 'saved' ? (
        <>
          <CheckCircle size={14} aria-hidden />
          <span>Tersimpan</span>
        </>
      ) : null}
    </p>
  )
}
