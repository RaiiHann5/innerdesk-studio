export const CLIPBOARD_CLEAR_MS = 20_000

export type ClipboardOutcome = 'cleared' | 'kept' | 'failed'

export interface CopyHandle {
  /** Settles once the clear attempt has run (or was cancelled, which resolves 'kept'). */
  done: Promise<ClipboardOutcome>
  /** Stops the countdown without touching the clipboard. */
  cancel: () => void
}

/**
 * Copies `text`, then tries to clear it after `clearAfterMs`. This is best effort and cannot be promised:
 *  - browsers only let a page write to the clipboard while it is focused, so a clear while the tab is in the background can fail;
 *  - if the clipboard now holds something else the person copied, it is left alone ('kept');
 *  - clipboard managers and other apps may already have taken a copy.
 * `onTick` receives the whole seconds left, for a countdown.
 */
export async function copyWithAutoClear(
  text: string,
  { clearAfterMs = CLIPBOARD_CLEAR_MS, onTick }: { clearAfterMs?: number; onTick?: (secondsLeft: number) => void } = {},
): Promise<CopyHandle> {
  await navigator.clipboard.writeText(text)

  let timer: ReturnType<typeof setInterval> | undefined
  let finish: (outcome: ClipboardOutcome) => void = () => {}
  const done = new Promise<ClipboardOutcome>((resolve) => (finish = resolve))
  const endsAt = Date.now() + clearAfterMs

  const attemptClear = async (): Promise<ClipboardOutcome> => {
    try {
      let current: string | null = null
      try {
        current = await navigator.clipboard.readText()
      } catch {
        // Reading needs a permission that may be denied. Clearing anyway is the safer mistake.
      }
      if (current !== null && current !== text) return 'kept'
      await navigator.clipboard.writeText('')
      return 'cleared'
    } catch {
      return 'failed'
    }
  }

  onTick?.(Math.ceil(clearAfterMs / 1000))
  timer = setInterval(() => {
    const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
    onTick?.(left)
    if (left > 0) return
    clearInterval(timer)
    void attemptClear().then(finish)
  }, 1000)

  return {
    done,
    cancel: () => {
      clearInterval(timer)
      finish('kept')
    },
  }
}
