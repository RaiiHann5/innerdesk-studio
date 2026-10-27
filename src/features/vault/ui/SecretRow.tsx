import type { ReactNode } from 'react'
import { Copy, Eye, EyeSlash } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { cn } from '@/lib/cn'
import { useReveal } from './useReveal'

export type CopyFn = (label: string, value: string) => void

const rowClass = 'flex items-start gap-2 border-b py-3 last:border-b-0'
const MASK = '••••••••••'

/**
 * A secret value: masked by default, and the real text is not in the DOM until revealed.
 * The mask is a fixed string, so it does not leak the length either.
 */
export function SecretRow({ label, value, onCopy, multiline = false }: { label: string; value: string; onCopy: CopyFn; multiline?: boolean }) {
  const { revealed, secondsLeft, toggle } = useReveal()
  const empty = value.length === 0
  return (
    <div className={rowClass}>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        {empty ? (
          <p className="mt-1 text-base text-muted">Kosong</p>
        ) : revealed ? (
          <p className={cn('mt-1 select-text text-base', multiline ? 'whitespace-pre-wrap break-words' : 'break-all font-mono')}>{value}</p>
        ) : (
          <p className="mt-1 text-base text-muted">
            <span aria-hidden>{MASK}</span>
            <span className="sr-only">Disembunyikan</span>
          </p>
        )}
        {revealed && (
          <p aria-hidden className="mt-1 text-xs tabular-nums text-muted">
            Disembunyikan lagi dalam {secondsLeft} dtk
          </p>
        )}
      </div>
      <IconButton
        icon={revealed ? EyeSlash : Eye}
        label={revealed ? `Sembunyikan ${label}` : `Tampilkan ${label}`}
        disabled={empty}
        onClick={toggle}
      />
      <IconButton icon={Copy} label={`Salin ${label}`} disabled={empty} onClick={() => onCopy(label, value)} />
    </div>
  )
}

/** A value that is not secret (a username, a network name). Shown as is, with an optional copy button. */
export function FieldRow({ label, value, onCopy, children }: { label: string; value?: string; onCopy?: CopyFn; children?: ReactNode }) {
  const shown = children ?? (value ? <span className="break-words">{value}</span> : <span className="text-muted">Kosong</span>)
  return (
    <div className={rowClass}>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <div className="mt-1 text-base">{shown}</div>
      </div>
      {onCopy && value && <IconButton icon={Copy} label={`Salin ${label}`} onClick={() => onCopy(label, value)} />}
    </div>
  )
}
