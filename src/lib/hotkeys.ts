import { useEffect } from 'react'

export const modKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'

/** Fires on Cmd/Ctrl + key, even while typing in an input. */
export function useModHotkey(key: string, handler: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, handler])
}

/** True when a key press is meant for text entry rather than for a page shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.closest('input, textarea, select') !== null
}

export interface KeyCombo {
  /** Compared as typed, so 'L' with `shift` means Shift+L. */
  key: string
  shift?: boolean
}

/** No Ctrl, Cmd or Alt; Shift only when the combo asks for it. */
export function matchesKeyCombo(e: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>, combo: KeyCombo): boolean {
  return e.key === combo.key && !e.metaKey && !e.ctrlKey && !e.altKey && e.shiftKey === Boolean(combo.shift)
}

/** A bare-key shortcut, like the calendar's: ignored while typing, while a key is held down, and when `enabled` is false. */
export function useKeyHotkey(combo: KeyCombo, handler: () => void, enabled = true) {
  const { key, shift } = combo
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.defaultPrevented || !matchesKeyCombo(e, { key, shift }) || isTypingTarget(e.target)) return
      e.preventDefault()
      handler()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [key, shift, handler, enabled])
}
