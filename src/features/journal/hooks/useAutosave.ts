import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { createAutosaver, type Autosaver, type SaveStatus } from '../lib/autosaver'

const AUTOSAVE_DELAY = 600

/**
 * An autosaver tied to the component's life. Whatever is waiting is saved when the component unmounts
 * (route change, switching day) and when the page is hidden or closed, so leaving never costs text.
 * Create it once per day being edited: `save` is read when the hook first runs.
 */
export function useAutosave<T>(save: (value: T) => Promise<void>): { saver: Autosaver<T>; status: SaveStatus } {
  // One autosaver per mounted editor: `save` is read once, on the first render.
  const saver = useMemo(() => createAutosaver<T>({ delay: AUTOSAVE_DELAY, save }), [])
  const status = useSyncExternalStore(saver.subscribe, saver.getStatus)

  useEffect(() => {
    const flush = () => void saver.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [saver])

  return { saver, status }
}
