import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { MIN_MASTER_PASSWORD_LENGTH } from '@/lib/crypto'
import { cn } from '@/lib/cn'
import { useVaultStore } from '../store/vaultStore'
import { MasterPasswordInput } from './MasterPasswordInput'
import { StrengthMeter } from './StrengthMeter'

const MESSAGES = {
  invalid: 'Format kunci pemulihan tidak sesuai. Periksa lagi 8 kelompok yang kamu masukkan.',
  wrong: 'Vault tidak bisa dibuka dengan kunci ini.',
  conflict: 'Vault berubah di tab lain. Muat ulang halaman lalu coba lagi.',
  busy: '',
  corrupt: 'Data vault tidak bisa dibaca.',
  unavailable: 'Vault tidak bisa dibuka.',
} as const

export function RecoveryForm({ onWait, onCancel }: { onWait: (retryAt: number) => void; onCancel: () => void }) {
  const unlockWithRecovery = useVaultStore((s) => s.unlockWithRecovery)
  const [key, setKey] = useState('')
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const longEnough = [...password.normalize('NFKC')].length >= MIN_MASTER_PASSWORD_LENGTH
  const ready = key.trim().length > 0 && longEnough && password === repeat && !busy

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    const result = await unlockWithRecovery(key, password)
    setBusy(false)
    if (result.ok) return
    if (result.error === 'wait') return onWait(result.retryAt)
    setError(MESSAGES[result.error])
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-5 space-y-4 border-t pt-5" aria-label="Pulihkan dengan kunci pemulihan">
      <p className="text-sm text-muted">Masukkan kunci pemulihan lalu buat kata sandi utama yang baru. Kunci pemulihan tetap berlaku sesudahnya.</p>
      <Field label="Kunci pemulihan" htmlFor="vault-recovery-key">
        <input
          id="vault-recovery-key"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className={cn(controlClass, 'font-mono tabular-nums')}
        />
      </Field>
      <Field label="Kata sandi utama baru" htmlFor="vault-recovery-password" hint={`Minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter.`}>
        <MasterPasswordInput id="vault-recovery-password" autoComplete="new-password" value={password} aria-describedby="vault-recovery-strength" onChange={(e) => setPassword(e.target.value)} />
      </Field>
      <StrengthMeter id="vault-recovery-strength" password={password} />
      <Field label="Ulangi kata sandi baru" htmlFor="vault-recovery-repeat">
        <MasterPasswordInput id="vault-recovery-repeat" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
      </Field>
      {repeat.length > 0 && password !== repeat && <p className="-mt-2 text-xs text-status-overdue">Kata sandi belum sama.</p>}
      {error && (
        <p role="alert" className="text-sm text-status-overdue">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!ready}>
          {busy ? 'Memulihkan…' : 'Pulihkan dan buka vault'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Batal
        </Button>
      </div>
    </form>
  )
}
