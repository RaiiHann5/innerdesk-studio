import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LockKey } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { lockMessage } from '../lib/autoLock'
import { getVaultWaitMs, useVaultStore } from '../store/vaultStore'
import { useVaultPrefs } from '../store/vaultPrefs'
import { HowItWorksLink } from './HowItWorks'
import { MasterPasswordInput } from './MasterPasswordInput'
import { RecoveryForm } from './RecoveryForm'
import { useCountdown } from './useCountdown'

export function LockedView() {
  const unlock = useVaultStore((s) => s.unlock)
  const lockReason = useVaultStore((s) => s.lockReason)
  const idleMinutes = useVaultPrefs((s) => s.autoLockMinutes)

  const [value, setValue] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState<number | null>(() => {
    const wait = getVaultWaitMs()
    return wait > 0 ? Date.now() + wait : null
  })
  const [recovery, setRecovery] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const secondsLeft = useCountdown(retryAt)
  const waiting = secondsLeft > 0

  useEffect(() => {
    inputRef.current?.focus()
  }, [recovery])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (checking || waiting || value.length === 0) return
    setChecking(true)
    setError(null)
    const result = await unlock(value)
    setChecking(false)
    if (result.ok) return
    setValue('')
    if (result.error === 'wait') setRetryAt(result.retryAt)
    else setError(result.error === 'conflict' ? 'Vault berubah di tab lain. Muat ulang halaman lalu coba lagi.' : 'Vault tidak bisa dibuka. Periksa kata sandi, lalu coba lagi.')
    inputRef.current?.focus()
  }

  return (
    <section aria-labelledby="locked-title" className="mx-auto w-full max-w-md rounded-card border bg-surface p-5 md:p-6">
      <LockKey size={24} aria-hidden className="text-muted" />
      <h2 id="locked-title" className="mt-3 font-display text-lg font-bold tracking-tight">
        Vault terkunci
      </h2>
      <p className="mt-1 text-sm text-muted">{lockReason ? lockMessage(lockReason, idleMinutes) : 'Masukkan kata sandi utama untuk membukanya.'}</p>

      {!recovery && (
        <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4">
          <Field label="Kata sandi utama" htmlFor="vault-password">
            <MasterPasswordInput
              ref={inputRef}
              id="vault-password"
              value={value}
              aria-invalid={error !== null}
              aria-describedby={error ? 'vault-unlock-error' : undefined}
              onChange={(e) => {
                setValue(e.target.value)
                setError(null)
              }}
            />
          </Field>

          {error && (
            <p id="vault-unlock-error" role="alert" className="text-sm text-status-overdue">
              {error}
            </p>
          )}
          {waiting && (
            <div className="space-y-1">
              <p role="status" className="text-sm">
                Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi.
              </p>
              <p aria-hidden className="text-sm tabular-nums text-muted">
                Coba lagi dalam {secondsLeft} dtk
              </p>
              <p className="text-xs text-muted">Jeda ini hanya kenyamanan. Perlindungan yang sebenarnya adalah proses penurunan kunci yang sengaja dibuat lambat.</p>
            </div>
          )}

          <Button type="submit" variant="primary" disabled={checking || waiting || value.length === 0} className="w-full">
            {checking ? 'Membuka…' : 'Buka vault'}
          </Button>
        </form>
      )}

      {recovery ? (
        <RecoveryForm onWait={setRetryAt} onCancel={() => setRecovery(false)} />
      ) : (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => setRecovery(true)} className="text-sm text-accent-text underline underline-offset-2">
            Lupa kata sandi? Pakai kunci pemulihan
          </button>
          <HowItWorksLink />
        </div>
      )}
    </section>
  )
}
