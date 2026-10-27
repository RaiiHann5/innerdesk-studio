import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/features/auth/authStore'
import { BACKEND } from '@/lib/supabase'

export function AccountCard() {
  const email = useAuthStore((s) => s.email)
  const signOut = useAuthStore((s) => s.signOut)
  if (BACKEND !== 'supabase') return null
  return (
    <section aria-labelledby="account-title" className="rounded-card border bg-surface p-4 md:p-5">
      <h2 id="account-title" className="font-display text-md font-bold tracking-tight">
        Akun
      </h2>
      <p className="mt-1 text-sm text-muted">
        Masuk sebagai <span className="font-medium text-ink">{email ?? 'akun kamu'}</span>. Data tersimpan di akun ini dan tersinkron di semua perangkat.
      </p>
      <Button className="mt-3" onClick={() => void signOut()}>
        Keluar
      </Button>
    </section>
  )
}
