export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface Autosaver<T> {
  /** Queue the latest value. Earlier unsaved values are replaced, and the save runs after `delay` of quiet. */
  schedule: (value: T) => void
  /** Save whatever is waiting right now. Safe to call with nothing pending. */
  flush: () => Promise<void>
  /** Drop the waiting value without saving it, for when the record is about to be deleted. */
  cancel: () => void
  hasPending: () => boolean
  getStatus: () => SaveStatus
  subscribe: (listener: () => void) => () => void
}

interface Options<T> {
  delay: number
  save: (value: T) => Promise<void>
}

/**
 * Debounced saving with no framework in it, so the rules can be tested on their own.
 *
 * - Saves never overlap: a flush that arrives while one is running waits for it.
 * - A failed save keeps its value waiting, so the next flush or edit retries it and nothing is lost.
 * - `flush` starts the save synchronously when idle, which matters inside `beforeunload`.
 */
export function createAutosaver<T>({ delay, save }: Options<T>): Autosaver<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { value: T } | undefined
  let inflight: Promise<void> | undefined
  let status: SaveStatus = 'idle'
  const listeners = new Set<() => void>()

  const setStatus = (next: SaveStatus) => {
    if (status === next) return
    status = next
    listeners.forEach((listener) => listener())
  }
  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  const run = async (): Promise<void> => {
    if (!pending) return
    const job = pending
    pending = undefined
    setStatus('saving')
    try {
      await save(job.value)
      setStatus(pending ? 'pending' : 'saved')
    } catch {
      // Keep the failed value unless something newer has arrived since.
      pending ??= job
      setStatus('error')
    }
  }

  const flush = (): Promise<void> => {
    clearTimer()
    if (!pending) return inflight ?? Promise.resolve()
    const start = inflight ? inflight.then(run) : run()
    const tracked: Promise<void> = start.finally(() => {
      if (inflight === tracked) inflight = undefined
    })
    inflight = tracked
    return tracked
  }

  return {
    schedule(value) {
      pending = { value }
      setStatus('pending')
      clearTimer()
      timer = setTimeout(() => void flush(), delay)
    },
    flush,
    cancel() {
      clearTimer()
      pending = undefined
      if (status === 'pending') setStatus('idle')
    },
    hasPending: () => pending !== undefined,
    getStatus: () => status,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
