import { useId, useState, type FormEvent } from 'react'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { useAuthStore } from './authStore'

const MIN_PASSWORD = 8

export function AuthScreen() {
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  const [mode, setMode] = useState<'masuk' | 'daftar'>('masuk')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const id = useId()
  const signingUp = mode === 'daftar'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)
    setNotice(null)
    // Client checks are only for quick feedback. The server is what enforces the rules.
    if (signingUp && password.length < MIN_PASSWORD) return setError(`Kata sandi minimal ${MIN_PASSWORD} karakter.`)
    setBusy(true)
    try {
      if (signingUp) {
        const result = await signUp(email, password)
        if (result.error) setError(result.error)
        else if (result.confirm) setNotice('Akun dibuat. Buka email kamu dan konfirmasi, lalu masuk.')
      } else {
        const message = await signIn(email, password)
        if (message) setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <BrandLogo className="mb-8 h-8" />
        <h1 className="font-display text-lg font-bold tracking-tight">{signingUp ? 'Buat akun' : 'Masuk'}</h1>
        <p className="mt-1 text-sm text-muted">{signingUp ? 'Data kamu tersimpan di akunmu sendiri dan tidak terlihat oleh akun lain.' : 'Masuk untuk membuka data kamu.'}</p>

        <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4" aria-busy={busy}>
          <Field label="Email" htmlFor={`${id}-email`}>
            <input id={`${id}-email`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={controlClass} />
          </Field>
          <Field label="Kata sandi" htmlFor={`${id}-password`} hint={signingUp ? `Minimal ${MIN_PASSWORD} karakter.` : undefined}>
            <input
              id={`${id}-password`}
              type="password"
              required
              autoComplete={signingUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={controlClass}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-status-overdue">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-control bg-sunken px-3 py-2 text-sm">
              {notice}
            </p>
          )}
          <Button type="submit" variant="primary" disabled={busy} className="h-9 w-full">
            {busy ? 'Memproses…' : signingUp ? 'Daftar' : 'Masuk'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(signingUp ? 'masuk' : 'daftar')
            setError(null)
            setNotice(null)
          }}
          className="mt-4 text-sm text-accent-text underline underline-offset-2"
        >
          {signingUp ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
        </button>
      </div>
    </main>
  )
}
