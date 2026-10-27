import { WarningCircle } from '@phosphor-icons/react'
import { Button } from './Button'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Data gagal dimuat', message, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-card border px-6 py-12 text-center">
      <WarningCircle size={24} className="text-status-overdue" aria-hidden />
      <div className="max-w-xs">
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
      {onRetry && <Button onClick={onRetry}>Coba lagi</Button>}
    </div>
  )
}
