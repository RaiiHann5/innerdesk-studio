import { useEffect } from 'react'
import { useUiStore } from '@/stores/ui'

export function Toast() {
  const toast = useUiStore((s) => s.toast)
  const clear = useUiStore((s) => s.clearToast)

  useEffect(() => {
    if (!toast) return
    // An offer to retry should stay long enough to actually be read and used.
    const timer = window.setTimeout(clear, toast.action ? 8000 : 3200)
    return () => window.clearTimeout(timer)
  }, [toast, clear])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center md:bottom-6">
      {toast && (
        <div
          key={toast.id}
          className="pointer-events-auto flex animate-pop-in items-center gap-3 rounded-control bg-ink px-3 py-2 text-sm font-medium text-bg shadow-lift"
        >
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run()
                clear()
              }}
              className="rounded-chip border border-bg/25 px-2 py-0.5 text-xs font-semibold transition-colors duration-fast hover:bg-bg/10"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}