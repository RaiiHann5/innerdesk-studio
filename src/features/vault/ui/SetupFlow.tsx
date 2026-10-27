import { useEffect, useState, type FormEvent } from 'react'
import { LockKey, Warning } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { MIN_MASTER_PASSWORD_LENGTH } from '@/lib/crypto'
import { useVaultStore } from '../store/vaultStore'
import { HowItWorksLink } from './HowItWorks'
import { MasterPasswordInput } from './MasterPasswordInput'
import { RecoveryKeyConfirm } from './RecoveryKeyConfirm'
import { RestoreBackupForm } from './RestoreBackupForm'
import { StrengthMeter } from './StrengthMeter'

const cardClass = 'mx-auto w-full max-w-md rounded-card border bg-surface p-5 md:p-6'

export function SetupFlow() {
  const beginSetup = useVaultStore((s) => s.beginSetup)
  const confirmSetup = useVaultStore((s) => s.confirmSetup)
  const cancelSetup = useVaultStore((s) => s.cancelSetup)

  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null)
  const [restoring, setRestoring] = useState(false)

  // Leaving before confirming throws the unconfirmed vault away: nothing was written.
  useEffect(() => () => cancelSetup(), [cancelSetup])

  const longEnough = [...password.normalize('NFKC')].length >= MIN_MASTER_PASSWORD_LENGTH
  const matches = password === repeat
  const canCreate = longEnough && matches && !busy

  const create = async (e: FormEvent) => {
    e.preventDefault()
    if (!canCreate) return
    setBusy(true)
    setError(null)
    try {
      setRecoveryKey(await beginSetup(password))
      setPassword('')
      setRepeat('')
    } catch {
      setError('Vault tidak bisa dibuat. Coba lagi.')
    } finally {
      setBusy(false)
    }
  }

  const finish = async () => {
    setBusy(true)
    setError(null)
    const result = await confirmSetup()
    setBusy(false)
    if (result.ok) return
    setError(
      result.error === 'conflict'
        ? 'Ternyata sudah ada vault dari tab lain. Layar kunci akan ditampilkan.'
        : 'Vault tidak bisa disimpan. Coba lagi.',
    )
  }

  const startOver = () => {
    cancelSetup()
    setRecoveryKey(null)
  }

  if (recoveryKey) {
    return (
      <section aria-labelledby="recovery-title" className={cardClass}>
        <LockKey size={24} aria-hidden className="text-muted" />
        <h2 id="recovery-title" className="mt-3 font-display text-lg font-bold tracking-tight">
          Simpan kunci pemulihan
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Kunci ini hanya ditampilkan sekali. Dengan kunci ini kamu bisa mengatur ulang kata sandi utama kalau lupa. Simpan di tempat yang terpisah dari perangkat ini, misalnya pengelola sandi atau kertas.
        </p>
        <RecoveryKeyConfirm
          recoveryKey={recoveryKey}
          busy={busy}
          error={error}
          confirmLabel="Selesai dan buka vault"
          onConfirm={() => void finish()}
          secondary={
            <Button variant="ghost" disabled={busy} onClick={startOver}>
              Ulangi dari awal
            </Button>
          }
        />
      </section>
    )
  }

  if (restoring) {
    return (
      <section aria-labelledby="restore-title" className={cardClass}>
        <h2 id="restore-title" className="font-display text-lg font-bold tracking-tight">
          Pulihkan dari backup
        </h2>
        <p className="mb-4 mt-1 text-sm text-muted">Pilih file backup terenkripsi dan masukkan kata sandi utama yang berlaku saat backup dibuat.</p>
        <RestoreBackupForm replacing={false} onCancel={() => setRestoring(false)} />
      </section>
    )
  }

  return (
    <section aria-labelledby="setup-title" className={cardClass}>
      <LockKey size={24} aria-hidden className="text-muted" />
      <h2 id="setup-title" className="mt-3 font-display text-lg font-bold tracking-tight">
        Buat vault pribadi
      </h2>
      <p className="mt-1 text-sm text-muted">
        Tempat untuk kata sandi, kunci API, dan catatan rahasia. Semuanya dienkripsi di perangkat ini dengan kata sandi utama yang kamu buat sekarang.
      </p>

      <div className="mt-4 flex gap-2.5 rounded-control bg-sunken px-3 py-2.5 text-sm">
        <Warning size={18} aria-hidden className="mt-0.5 shrink-0" />
        <p>
          <span className="font-medium">Tidak ada pemulihan oleh siapa pun.</span> Kalau kata sandi utama dan kunci pemulihan sama-sama hilang, isi vault tidak bisa dibuka lagi, oleh kami maupun siapa pun.
        </p>
      </div>

      <form onSubmit={(e) => void create(e)} className="mt-5 space-y-4">
        <Field
          label="Kata sandi utama"
          htmlFor="vault-new-password"
          hint={`Minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter. Frasa sandi dari 5 atau 6 kata acak lebih kuat dan lebih mudah diingat daripada karakter acak yang pendek.`}
        >
          <MasterPasswordInput
            id="vault-new-password"
            autoComplete="new-password"
            value={password}
            aria-describedby="vault-new-strength"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <StrengthMeter id="vault-new-strength" password={password} />

        <Field label="Ulangi kata sandi utama" htmlFor="vault-repeat-password">
          <MasterPasswordInput
            id="vault-repeat-password"
            autoComplete="new-password"
            value={repeat}
            aria-invalid={repeat.length > 0 && !matches}
            aria-describedby={repeat.length > 0 && !matches ? 'vault-repeat-error' : undefined}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </Field>
        {repeat.length > 0 && !matches && (
          <p id="vault-repeat-error" className="-mt-2 text-xs text-status-overdue">
            Kata sandi belum sama.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-status-overdue">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canCreate} className="w-full">
          {busy ? 'Membuat kunci…' : 'Lanjut'}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setRestoring(true)} className="text-sm text-accent-text underline underline-offset-2">
          Sudah punya backup? Pulihkan
        </button>
        <HowItWorksLink />
      </div>
    </section>
  )
}
