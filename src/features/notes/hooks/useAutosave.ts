import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const AUTOSAVE_DELAY_MS = 600

interface Job<T> {
  id: string
  value: T
}

interface UseAutosaveOptions<T> {
  /** The note being edited. Every change is saved against the id that was current when it was made. */
  id: string
  save: (id: string, value: T) => Promise<void>
  delayMs?: number
}

interface SaveState {
  status: SaveStatus
  /** ISO time of the last save that finished in this session. */
  savedAt?: string
}

/**
 * Debounced saving with no save button.
 *
 * A change is stored together with the id it belongs to, so switching notes can flush the old note's
 * text under the old id and never write it into the new one. Saves run one after another, so a slow
 * earlier save cannot land on top of a later one.
 */
export function useAutosave<T>({ id, save, delayMs = AUTOSAVE_DELAY_MS }: UseAutosaveOptions<T>) {
  const [state, setState] = useState<SaveState>({ status: 'idle' })
  const saveRef = useRef(save)
  const currentId = useRef(id)
  const pending = useRef<Job<T> | null>(null)
  const failed = useRef<Job<T> | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const queue = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    saveRef.current = save
  }, [save])

  const write = useCallback((job: Job<T>): Promise<void> => {
    const run = async () => {
      const visible = () => currentId.current === job.id
      if (visible()) setState((s) => ({ ...s, status: 'saving' }))
      try {
        await saveRef.current(job.id, job.value)
        if (failed.current?.id === job.id) failed.current = null
        // Another change may be waiting for its debounce; the note is still dirty until it is written.
        if (visible() && !pending.current) setState({ status: 'saved', savedAt: new Date().toISOString() })
      } catch {
        failed.current = job
        if (visible()) setState((s) => ({ ...s, status: 'error' }))
      }
    }
    queue.current = queue.current.then(run)
    return queue.current
  }, [])

  /** Writes any waiting change now and resolves once everything queued has been saved. */
  const flush = useCallback((): Promise<void> => {
    clearTimeout(timer.current)
    timer.current = undefined
    const job = pending.current
    pending.current = null
    return job ? write(job) : queue.current
  }, [write])

  const schedule = useCallback(
    (value: T) => {
      pending.current = { id: currentId.current, value }
      failed.current = null
      clearTimeout(timer.current)
      timer.current = setTimeout(() => void flush(), delayMs)
      setState((s) => (s.status === 'saving' ? s : { ...s, status: 'saving' }))
    },
    [delayMs, flush],
  )

  /** Drops waiting and failed changes without saving. For a note that is about to be deleted. */
  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
    pending.current = null
    failed.current = null
  }, [])

  const retry = useCallback((): Promise<void> => {
    const job = failed.current
    failed.current = null
    return job ? write(job) : Promise.resolve()
  }, [write])

  useEffect(() => {
    currentId.current = id
    setState({ status: 'idle' })
    // Runs for the old id when the note changes, and on unmount.
    return () => void flush()
  }, [id, flush])

  useEffect(() => {
    const onLeave = () => void flush()
    window.addEventListener('beforeunload', onLeave)
    window.addEventListener('pagehide', onLeave)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      window.removeEventListener('pagehide', onLeave)
    }
  }, [flush])

  return { status: state.status, savedAt: state.savedAt, schedule, flush, cancel, retry }
}
