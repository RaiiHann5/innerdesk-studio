import { useCallback, useSyncExternalStore, type ReactNode } from 'react'
import type { LoadStatus } from '@/stores/createEntityStore'
import { ErrorState } from './ErrorState'

interface Loadable {
  status: LoadStatus
  error: string | null
  load: () => Promise<void>
}

/** Structural subset of a zustand store, so any entity store fits. */
export interface LoadableStore {
  getState: () => Loadable
  subscribe: (listener: () => void) => () => void
}

interface StoreGateProps {
  /** Must be a stable array (module-level constant). */
  stores: LoadableStore[]
  skeleton: ReactNode
  children: ReactNode
}

/** Renders a skeleton while stores load and an error state with retry if any of them fails. */
export function StoreGate({ stores, skeleton, children }: StoreGateProps) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const unsubs = stores.map((s) => s.subscribe(onChange))
      return () => unsubs.forEach((u) => u())
    },
    [stores],
  )
  const snapshot = useSyncExternalStore(subscribe, () => stores.map((s) => s.getState().status).join(','))
  const statuses = snapshot.split(',')

  if (statuses.includes('error')) {
    const failed = stores.filter((s) => s.getState().status === 'error')
    return (
      <ErrorState
        message={failed[0].getState().error ?? 'Terjadi kesalahan saat memuat data.'}
        onRetry={() => void Promise.all(failed.map((s) => s.getState().load()))}
      />
    )
  }
  if (statuses.some((s) => s === 'idle' || s === 'loading')) return <>{skeleton}</>
  return <>{children}</>
}
