import { useEffect } from 'react'

/** True when a key press is meant for text entry or a dialog rather than for a page shortcut. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest('input, textarea, select, [role="dialog"], [role="menu"], [role="listbox"]') !== null
}

/** N creates a note, unless focus is in an input, the editor or a dialog. */
export function useNewNoteShortcut(create: () => void | Promise<void>) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.repeat || e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      if (isTypingTarget(e.target) || document.querySelector('dialog[open]')) return
      e.preventDefault()
      void create()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [create])
}
