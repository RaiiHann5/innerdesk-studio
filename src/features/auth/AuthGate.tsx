import { useEffect, type ReactNode } from 'react'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { BACKEND } from '@/lib/supabase'
import { AuthScreen } from './AuthScreen'
import { useAuthStore } from './authStore'

/** In local mode there is no account and this renders its children. With Supabase nothing renders, and nothing loads, until someone is signed in. */
export function AuthGate({ children }: { children: ReactNode }) {
  return BACKEND === 'supabase' ? <RemoteGate>{children}</RemoteGate> : <>{children}</>
}

function RemoteGate({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status)
  const problem = useAuthStore((s) => s.problem)

  useEffect(() => {
    useAuthStore.getState().init()
  }, [])

  if (status === 'ready') return <>{children}</>
  if (status === 'signed-out') return <AuthScreen />
  if (status === 'error') {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-4">
        <div className="w-full max-w-sm">
          <ErrorState title="Tidak bisa memulai" message={problem ?? 'Terjadi kesalahan.'} onRetry={() => window.location.reload()} />
        </div>
      </main>
    )
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4" aria-busy="true" aria-label="Memuat">
      <Skeleton className="h-8 w-40" />
    </main>
  )
}
