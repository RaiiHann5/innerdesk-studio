import type { ReactNode } from 'react'
import { Button } from './Button'
import { Dialog } from './Dialog'

interface ConfirmChoice {
  label: string
  onClick: () => void
  primary?: boolean
}

interface ConfirmDialogProps {
  open: boolean
  label: string
  title: string
  description?: string
  /** Two ways out, such as "event ini saja" versus "semua event berulang". */
  choices?: ConfirmChoice[]
  onConfirm?: () => void
  confirmLabel?: string
  cancelLabel?: string
  /** Red confirm text, for anything that removes data. */
  destructive?: boolean
  onClose: () => void
  children?: ReactNode
}

/** Yes/no confirmation built on the native dialog, so focus is trapped and Escape works. */
export function ConfirmDialog({
  open,
  label,
  title,
  description,
  choices,
  onConfirm,
  confirmLabel = 'Ya, lanjutkan',
  cancelLabel = 'Batal',
  destructive,
  onClose,
  children,
}: ConfirmDialogProps) {
  const confirm = (run: () => void) => () => {
    onClose()
    run()
  }

  return (
    <Dialog open={open} onClose={onClose} label={label} className="max-w-sm">
      {open && (
        <div className="p-4">
          <h2 className="text-md font-bold tracking-tight">{title}</h2>
          {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          {children}
        </div>
      )}
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t bg-sunken/50 px-4 py-3">
        <Button variant="ghost" onClick={onClose}>
          {cancelLabel}
        </Button>
        {choices ? (
          choices.map((choice) => (
            <Button
              key={choice.label}
              variant={choice.primary ? 'primary' : 'secondary'}
              onClick={confirm(choice.onClick)}
            >
              {choice.label}
            </Button>
          ))
        ) : (
          onConfirm && (
            <Button
              variant={destructive ? 'secondary' : 'primary'}
              onClick={confirm(onConfirm)}
              className={destructive ? 'text-status-overdue' : undefined}
            >
              {confirmLabel}
            </Button>
          )
        )}
      </footer>
    </Dialog>
  )
}