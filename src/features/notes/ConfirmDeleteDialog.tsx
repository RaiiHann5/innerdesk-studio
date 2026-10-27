import { useEffect, useId, useRef } from 'react'
import { Button } from '@/components/ui/Button'

interface ConfirmDeleteDialogProps {
  open: boolean
  title: string
  onConfirm: () => void
  onCancel: () => void
}

/** A native modal dialog: the browser traps focus, closes on Escape and restores focus to the delete button. */
export function ConfirmDeleteDialog({ open, title, onConfirm, onCancel }: ConfirmDeleteDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = useId()
  const textId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      aria-describedby={textId}
      onClose={onCancel}
      className="w-[min(24rem,calc(100vw-2rem))] rounded-card border bg-surface p-5 text-ink backdrop:bg-black/40"
    >
      <h2 id={headingId} className="font-ui text-base font-medium">
        Hapus catatan ini?
      </h2>
      <p id={textId} className="mt-2 text-sm text-muted">
        Catatan “{title.trim() || 'Tanpa judul'}” akan dihapus. Kamu masih bisa mengurungkannya sesaat setelah dihapus.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <Button autoFocus onClick={onCancel}>
          Batal
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Hapus
        </Button>
      </div>
    </dialog>
  )
}
