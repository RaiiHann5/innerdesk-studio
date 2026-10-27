import { useEffect } from 'react'

interface FocusHotkeyHandlers {
  toggle: () => void
  reset: () => void
  skip: () => void
  enterZen: () => void
  exitZen: () => void
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))

/** Space already activates a focused button or link, so claiming it too would fire twice. */
const activatesOnSpace = (target: EventTarget | null) =>
  target instanceof HTMLElement && (/^(BUTTON|A|SUMMARY)$/.test(target.tagName) || target.getAttribute('role') === 'radio')

/**
 * Space starts and pauses, R resets, S skips, F enters focus mode, Escape leaves it.
 *
 * Every key is claimed with `preventDefault` so Space does not also scroll the page. Keys are
 * ignored while typing in a field, which matters most for Escape: it must close a dialog, not the
 * focus mode behind it.
 */
export function useFocusHotkeys({ toggle, reset, skip, enterZen, exitZen }: FocusHotkeyHandlers) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') {
        if (isTyping(e.target)) return
        exitZen()
        return
      }
      if (isTyping(e.target)) return
      const key = e.key.toLowerCase()
      if (e.code === 'Space') {
        if (activatesOnSpace(e.target)) return
        toggle()
      } else if (key === 'r') reset()
      else if (key === 's') skip()
      else if (key === 'f') enterZen()
      else return
      e.preventDefault()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [toggle, reset, skip, enterZen, exitZen])
}