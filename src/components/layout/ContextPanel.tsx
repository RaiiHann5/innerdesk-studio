import { useEffect, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { usePanel } from '@/lib/usePanel'
import { IconButton } from '@/components/ui/IconButton'

export function ContextPanel({ label, children }: { label: string; children: ReactNode }) {
  const { isWide, open, setOpen } = usePanel()

  useEffect(() => {
    if (isWide || !open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isWide, open, setOpen])

  if (isWide) {
    return (
      <aside
        aria-label={label}
        aria-hidden={!open}
        className={cn(
          'shrink-0 overflow-hidden bg-surface transition-[width] duration-base',
          open ? 'w-80 border-l' : 'invisible w-0',
        )}
      >
        <div className="h-full w-80 overflow-y-auto p-4">{children}</div>
      </aside>
    )
  }

  if (!open) return null
  return (
    <>
      <button
        type="button"
        aria-label="Tutup panel"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-ink/40"
      />
      <aside
        aria-label={label}
        className="fixed inset-y-0 right-0 z-50 flex w-80 max-w-full animate-slide-in flex-col border-l bg-surface shadow-lift"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-md font-bold">{label}</h2>
          <IconButton icon={X} label="Tutup panel" onClick={() => setOpen(false)} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
}
