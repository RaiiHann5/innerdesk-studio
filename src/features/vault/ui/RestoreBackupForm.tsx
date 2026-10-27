import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { useVaultStore } from '../store/vaultStore'
import { MasterPasswordInput } from './MasterPasswordInput'
import { useCountdown } from './useCountdown'

const MAX_BACKUP_BYTES = 40_000_000

const MESSAGES = {
  wrong: 'Vault tidak bisa dibuka dengan kata sandi ini. Pakai kata sandi yang berlaku saat backup dibuat.',
  corrupt: 'File ini bukan backup vault yang valid, atau isinya rusak. Vault yang ada tidak diubah.',
  invalid: 'Isian belum valid.',
  conflict: 'Vault berubah di tab lain. Muat ulang halaman lalu coba lagi.',
  busy: '',
  unavailable: 'Backup tidak bisa dipulihkan.',
} as const

/** Restores an encrypted backup. When it will replace a vault that works, the person has to say they understand. */
export function RestoreBackupForm({ replacing, onCancel }: { replacing: boolean; onCancel?: () => void }) {
  const restoreBackup = useVaultStore((s) => s.restoreBackup)
  const [fileName, setFileName] = useState<string | null>(null)
  const [text, setText] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [restored, setRestored] = useState(false)
  const secondsLeft = useCountdown(retryAt)

  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    setError(null)
    setText(null)
    setFileName(null)
    if (!file) return
    if (file.size > MAX_BACKUP_BYTES) return setError(MESSAGES.corrupt)
    try {
      setText(await file.text())
      setFileName(file.name)
    } catch {
      setError(MESSAGES.corrupt)
    }
  }

  const ready = text !== null && password.length > 0 && (!replacing || understood) && !busy && secondsLeft === 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready || text === null) return
    setBusy(true)
    setError(null)
    setRestored(false)
    setProgress(0)
    const result = await restoreBackup(text, password, (done, total) => setProgress(total === 0 ? 100 : Math.round((done / total) * 100)))
    setBusy(false)
    setProgress(null)
    if (result.ok) {
      setPassword('')
      setUnderstood(false)
      return setRestored(true)
    }
    setPassword('')
    if (result.error === 'wait') return setRetryAt(result.retryAt)
    setError(MESSAGES[result.error])
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" aria-label="Pulihkan dari backup terenkripsi">
      <Field label="File backup (.json)" htmlFor="restore-file" hint="File yang kamu ekspor dari vault ini, atau dari perangkat lain.">
        <input id="restore-file" type="file" accept="application/json,.json" onChange={(e) => void pick(e)} className={controlClass + ' h-auto py-1.5'} />
      </Field>
      {fileName && <p className="text-xs text-muted">Dipilih: {fileName}</p>}

      <Field label="Kata sandi utama saat backup dibuat" htmlFor="restore-password">
        <MasterPasswordInput id="restore-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Field>

      {replacing && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} className="mt-0.5 size-4 accent-[rgb(var(--accent))]" />
          <span>Saya paham vault yang ada sekarang akan diganti seluruhnya oleh isi backup ini.</span>
        </label>
      )}

      {progress !== null && <ProgressBar value={progress} label="Memeriksa backup" />}
      {secondsLeft > 0 && (
        <p role="status" className="text-sm">
          Terlalu banyak percobaan. Coba lagi dalam <span className="tabular-nums">{secondsLeft}</span> dtk.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-status-overdue">
          {error}
        </p>
      )}
      {restored && (
        <p role="status" className="text-sm">
          Backup dipulihkan. Vault sekarang berisi data dari backup itu.
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={!ready}>
          {busy ? 'Memulihkan…' : 'Pulihkan'}
        </Button>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Batal
          </Button>
        )}
      </div>
    </form>
  )
}
