import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, DownloadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Field } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { isoDay } from '@/lib/date'
import { MIN_MASTER_PASSWORD_LENGTH } from '@/lib/crypto'
import { IDLE_MINUTE_OPTIONS, type IdleMinutes } from '../lib/autoLock'
import { useVaultPrefs } from '../store/vaultPrefs'
import { useVaultStore } from '../store/vaultStore'
import { HowItWorks } from './HowItWorks'
import { MasterPasswordInput } from './MasterPasswordInput'
import { RecoveryKeyConfirm } from './RecoveryKeyConfirm'
import { RestoreBackupForm } from './RestoreBackupForm'
import { StrengthMeter } from './StrengthMeter'
import { useCountdown } from './useCountdown'

const Card = ({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) => (
  <section aria-labelledby={id} className="rounded-card border bg-surface p-5">
    <h2 id={id} className="font-display text-md font-bold tracking-tight">
      {title}
    </h2>
    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    <div className="mt-4 space-y-4">{children}</div>
  </section>
)

const ERRORS = {
  wrong: 'Kata sandi utama tidak cocok.',
  invalid: 'Isian belum valid.',
  busy: '',
  conflict: 'Vault berubah di tab lain. Muat ulang halaman lalu coba lagi.',
  unavailable: 'Tidak bisa dilakukan sekarang.',
  corrupt: 'Ada item tersimpan yang tidak bisa dibaca, jadi tidak ada yang diubah. Hapus item rusak di bagian Backup, atau pulihkan dari backup.',
} as const

function useWaitNote() {
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const seconds = useCountdown(retryAt)
  return {
    waiting: seconds > 0,
    setRetryAt,
    note:
      seconds > 0 ? (
        <p role="status" className="text-sm">
          Terlalu banyak percobaan. Coba lagi dalam <span className="tabular-nums">{seconds}</span> dtk.
        </p>
      ) : null,
  }
}

function LockSettings() {
  const minutes = useVaultPrefs((s) => s.autoLockMinutes)
  const setMinutes = useVaultPrefs((s) => s.setAutoLockMinutes)
  const blurOnBlur = useVaultPrefs((s) => s.blurOnBlur)
  const setBlurOnBlur = useVaultPrefs((s) => s.setBlurOnBlur)
  return (
    <Card id="settings-lock" title="Penguncian" description="Vault selalu terkunci setelah halaman dimuat ulang. Tidak ada pilihan untuk tidak pernah mengunci.">
      <SegmentedControl
        label="Kunci otomatis setelah tanpa aktivitas"
        value={String(minutes)}
        onChange={(value) => setMinutes(Number(value) as IdleMinutes)}
        options={IDLE_MINUTE_OPTIONS.map((option) => ({ value: String(option), label: `${option} mnt` }))}
      />
      <p className="text-xs text-muted">Vault juga terkunci kalau tab tersembunyi 2 menit atau lebih.</p>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="settings-blur-label" className="text-sm font-medium">
            Samarkan saat jendela tidak aktif
          </p>
          <p className="mt-0.5 text-xs text-muted">Memburamkan vault dan menyembunyikan rahasia yang sedang terbuka saat fokus berpindah ke jendela lain. Ini efek tampilan, bukan kunci.</p>
        </div>
        <Switch checked={blurOnBlur} onChange={setBlurOnBlur} labelledBy="settings-blur-label" />
      </div>
    </Card>
  )
}

function ChangePasswordCard() {
  const changePassword = useVaultStore((s) => s.changePassword)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const wait = useWaitNote()

  const longEnough = [...next.normalize('NFKC')].length >= MIN_MASTER_PASSWORD_LENGTH
  const ready = current.length > 0 && longEnough && next === repeat && !busy && !wait.waiting

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!ready) return
    setBusy(true)
    setError(null)
    setDone(false)
    const result = await changePassword(current, next)
    setBusy(false)
    if (result.ok) {
      setCurrent('')
      setNext('')
      setRepeat('')
      return setDone(true)
    }
    setCurrent('')
    if (result.error === 'wait') return wait.setRetryAt(result.retryAt)
    setError(ERRORS[result.error])
  }

  return (
    <Card id="settings-password" title="Kata sandi utama" description="Mengganti kata sandi tidak mengenkripsi ulang item, dan kunci pemulihanmu tetap berlaku.">
      <form onSubmit={(e) => void submit(e)} className="space-y-4" aria-labelledby="settings-password">
        <Field label="Kata sandi utama saat ini" htmlFor="pw-current">
          <MasterPasswordInput id="pw-current" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Kata sandi utama baru" htmlFor="pw-new" hint={`Minimal ${MIN_MASTER_PASSWORD_LENGTH} karakter.`}>
          <MasterPasswordInput id="pw-new" autoComplete="new-password" value={next} aria-describedby="pw-new-strength" onChange={(e) => setNext(e.target.value)} />
        </Field>
        <StrengthMeter id="pw-new-strength" password={next} />
        <Field label="Ulangi kata sandi baru" htmlFor="pw-repeat">
          <MasterPasswordInput id="pw-repeat" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </Field>
        {repeat.length > 0 && next !== repeat && <p className="-mt-2 text-xs text-status-overdue">Kata sandi belum sama.</p>}
        {wait.note}
        {error && (
          <p role="alert" className="text-sm text-status-overdue">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm">
            Kata sandi utama diganti. Backup lama tetap membutuhkan kata sandi yang lama.
          </p>
        )}
        <Button type="submit" variant="primary" disabled={!ready}>
          {busy ? 'Menyimpan…' : 'Ganti kata sandi'}
        </Button>
      </form>
    </Card>
  )
}

function RecoveryCard() {
  const rotateKey = useVaultStore((s) => s.rotateKey)
  const [password, setPassword] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const wait = useWaitNote()
  const busy = progress !== null

  const rotate = async (e: FormEvent) => {
    e.preventDefault()
    if (busy || password.length === 0 || wait.waiting) return
    setError(null)
    setFinished(false)
    setProgress(0)
    const result = await rotateKey(password, (done, total) => setProgress(total === 0 ? 100 : Math.round((done / total) * 100)))
    setProgress(null)
    setPassword('')
    if (result.ok && 'recoveryKey' in result) return setNewKey(result.recoveryKey)
    if (!result.ok) {
      if (result.error === 'wait') return wait.setRetryAt(result.retryAt)
      setError(ERRORS[result.error])
    }
  }

  return (
    <Card id="settings-recovery" title="Kunci pemulihan dan rotasi kunci">
      <details className="group rounded-control border px-3 py-2 text-sm">
        <summary className="cursor-pointer font-medium">Petunjuk pemulihan</summary>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted">
          <li>Kunci pemulihan ditampilkan sekali saat vault dibuat, dan tidak bisa dilihat lagi. Aplikasi ini tidak menyimpannya.</li>
          <li>Kalau lupa kata sandi utama: di layar kunci pilih "Lupa kata sandi? Pakai kunci pemulihan", masukkan kuncinya, lalu buat kata sandi baru.</li>
          <li>Simpan kuncinya terpisah dari perangkat ini dan dari file backup, misalnya di pengelola sandi atau di kertas.</li>
          <li>Kalau kata sandi utama dan kunci pemulihan hilang, isi vault tidak bisa dibuka lagi oleh siapa pun.</li>
          <li>Kunci pemulihan yang hilang tapi kata sandi masih ada: lakukan rotasi kunci di bawah untuk mendapat kunci pemulihan baru.</li>
        </ol>
      </details>

      {newKey ? (
        <div className="space-y-3" role="group" aria-label="Kunci pemulihan baru">
          <p className="text-sm">
            <span className="font-medium">Rotasi selesai.</span> Kunci pemulihan yang lama tidak berlaku lagi. Simpan yang baru ini sekarang; setelah ditutup, tidak bisa dilihat lagi.
          </p>
          <RecoveryKeyConfirm
            recoveryKey={newKey}
            busy={false}
            error={null}
            confirmLabel="Sudah tersimpan"
            onConfirm={() => {
              setNewKey(null)
              setFinished(true)
            }}
          />
        </div>
      ) : (
        <form onSubmit={(e) => void rotate(e)} className="space-y-4" aria-label="Rotasi kunci">
          <p className="text-sm text-muted">
            Rotasi membuat kunci vault baru dan kunci pemulihan baru, lalu mengenkripsi ulang semua item. Berhasil seluruhnya atau tidak sama sekali. Backup yang sudah ada tetap memakai kunci lama dan tidak ikut dicabut.
          </p>
          <Field label="Kata sandi utama" htmlFor="rotate-password">
            <MasterPasswordInput id="rotate-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {progress !== null && <ProgressBar value={progress} label="Mengenkripsi ulang item" />}
          {wait.note}
          {error && (
            <p role="alert" className="text-sm text-status-overdue">
              {error}
            </p>
          )}
          {finished && (
            <p role="status" className="text-sm">
              Kunci diganti dan kunci pemulihan baru sudah dikonfirmasi.
            </p>
          )}
          <Button type="submit" variant="primary" disabled={busy || password.length === 0 || wait.waiting}>
            {busy ? 'Mengenkripsi ulang…' : 'Rotasi kunci'}
          </Button>
        </form>
      )}
    </Card>
  )
}

function BackupCard() {
  const exportBackup = useVaultStore((s) => s.exportBackup)
  const unreadable = useVaultStore((s) => s.unreadable)
  const removeUnreadable = useVaultStore((s) => s.removeUnreadable)
  const [error, setError] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removed, setRemoved] = useState<number | null>(null)

  const download = async () => {
    setError(null)
    try {
      const text = await exportBackup()
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `innerdesk-vault-backup-${isoDay(0)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setError('Backup tidak bisa dibuat.')
    }
  }

  return (
    <Card id="settings-backup" title="Backup terenkripsi" description="File JSON yang hanya berisi data terenkripsi dan parameter kunci. Tidak ada teks asli di dalamnya.">
      <div className="space-y-2">
        <Button onClick={() => void download()}>
          <DownloadSimple aria-hidden /> Ekspor backup
        </Button>
        <p className="text-xs text-muted">
          Membukanya butuh kata sandi utama yang berlaku saat ini. Kunci pemulihan yang berlaku saat ini juga bisa membukanya, jadi simpan file ini terpisah dari kunci pemulihan. Penyimpanan peramban bisa dihapus tanpa peringatan, jadi ekspor secara berkala.
        </p>
        {error && (
          <p role="alert" className="text-sm text-status-overdue">
            {error}
          </p>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-2 text-sm font-medium">Pulihkan dari backup</h3>
        <RestoreBackupForm replacing />
      </div>

      {unreadable > 0 && (
        <div className="space-y-2 border-t pt-4">
          <h3 className="text-sm font-medium">Item rusak</h3>
          <p className="text-sm text-muted">
            {unreadable} item tersimpan tidak bisa dibaca dan dibiarkan apa adanya. Itu menghalangi rotasi kunci. Hapus permanen hanya setelah kamu mengekspor backup atau yakin isinya tidak diperlukan.
          </p>
          <Button onClick={() => setConfirmRemove(true)}>Hapus {unreadable} item rusak</Button>
        </div>
      )}
      {removed !== null && (
        <p role="status" className="text-sm">
          {removed} item rusak dihapus.
        </p>
      )}

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)} label="Hapus item rusak" className="max-w-sm">
        <div className="space-y-4 p-5">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Hapus {unreadable} item rusak?</h2>
            <p className="mt-1 text-sm text-muted">Penghapusan ini permanen dan tidak bisa diurungkan. Backup yang sudah kamu ekspor tidak terpengaruh.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmRemove(false)}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setConfirmRemove(false)
                void removeUnreadable().then(setRemoved)
              }}
            >
              Hapus permanen
            </Button>
          </div>
        </div>
      </Dialog>
    </Card>
  )
}

export function VaultSettings() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader
        title="Pengaturan vault"
        description="Penguncian, kata sandi, kunci pemulihan, dan backup."
        actions={
          <Button onClick={() => navigate('/vault')}>
            <ArrowLeft aria-hidden /> Kembali ke vault
          </Button>
        }
      />
      <div className="max-w-xl space-y-5">
        <LockSettings />
        <ChangePasswordCard />
        <RecoveryCard />
        <BackupCard />
        <Card id="settings-how" title="Cara kerja dan batasan">
          <HowItWorks />
        </Card>
      </div>
    </>
  )
}
