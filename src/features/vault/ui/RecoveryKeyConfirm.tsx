import { useState, type ReactNode } from 'react'
import { Copy, DownloadSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { copyWithAutoClear } from '@/lib/clipboard'
import { cn } from '@/lib/cn'

/** The two groups the person retypes to show the key was really saved: the 3rd and the 6th of 8. */
export const CHECK_GROUPS = [2, 5] as const

/** Same forgiveness as parsing the key: case, spaces, and the usual misreads (O for 0, I or L for 1). */
export const normalizeGroup = (text: string): string =>
  text
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')

export function downloadRecoveryKey(recoveryKey: string) {
  const text = [
    'Innerdesk Studio: kunci pemulihan vault',
    '',
    recoveryKey,
    '',
    'Simpan file ini di tempat yang terpisah dari perangkat ini (pengelola sandi, flash disk, atau cetak lalu simpan).',
    'Siapa pun yang memegang kunci ini dan data vault bisa mengatur ulang kata sandi utama.',
    'Kalau kunci ini dan kata sandi utama hilang, isi vault tidak bisa dibuka lagi oleh siapa pun.',
    '',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'innerdesk-vault-kunci-pemulihan.txt'
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

interface RecoveryKeyConfirmProps {
  recoveryKey: string
  busy: boolean
  error: string | null
  confirmLabel: string
  onConfirm: () => void
  /** An extra button next to the confirm button, such as "Ulangi dari awal". */
  secondary?: ReactNode
}

/**
 * Shows a recovery key once and only lets the person go on after they say they saved it AND retype two of its
 * groups. The retype is a check that the key was actually copied somewhere, not a security measure.
 */
export function RecoveryKeyConfirm({ recoveryKey, busy, error, confirmLabel, onConfirm, secondary }: RecoveryKeyConfirmProps) {
  const groups = recoveryKey.split('-')
  const [saved, setSaved] = useState(false)
  const [typed, setTyped] = useState<string[]>(['', ''])
  const [copyNote, setCopyNote] = useState('')

  const checksOut = CHECK_GROUPS.every((index, n) => normalizeGroup(typed[n]) === normalizeGroup(groups[index]))
  const ready = saved && checksOut && !busy

  const copy = async () => {
    try {
      const handle = await copyWithAutoClear(recoveryKey, {
        onTick: (left) => setCopyNote(left > 0 ? `Disalin. Papan klip dibersihkan otomatis dalam ${left} dtk (upaya terbaik, tidak dijamin).` : ''),
      })
      void handle.done.then((outcome) => outcome === 'failed' && setCopyNote('Papan klip tidak bisa dibersihkan otomatis. Salin hal lain untuk menimpanya.'))
    } catch {
      setCopyNote('Tidak bisa menyalin. Tulis kuncinya secara manual atau unduh.')
    }
  }

  return (
    <div>
      <div
        className="grid grid-cols-4 gap-x-3 gap-y-2 rounded-control border bg-sunken px-3 py-3 font-mono text-base font-medium tabular-nums"
        aria-label="Kunci pemulihan, delapan kelompok empat karakter"
      >
        {groups.map((group, index) => (
          <span key={index}>{group}</span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={() => void copy()}>
          <Copy aria-hidden /> Salin
        </Button>
        <Button onClick={() => downloadRecoveryKey(recoveryKey)}>
          <DownloadSimple aria-hidden /> Unduh .txt
        </Button>
      </div>
      <p role="status" className="mt-2 min-h-4 text-xs text-muted">
        {copyNote}
      </p>
      <p className="mt-1 text-xs text-muted">File unduhan berisi kunci ini. Pindahkan ke tempat aman, lalu hapus dari folder Download.</p>

      <fieldset className="mt-5">
        <legend className="text-sm font-medium">Pastikan sudah tersimpan: ketik dua kelompok dari kunci yang kamu simpan.</legend>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {CHECK_GROUPS.map((index, n) => (
            <div key={index}>
              <label htmlFor={`recovery-check-${index}`} className="block text-xs text-muted">
                Kelompok ke-{index + 1}
              </label>
              <input
                id={`recovery-check-${index}`}
                type="text"
                value={typed[n]}
                maxLength={6}
                autoComplete="off"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                onChange={(e) => setTyped((current) => current.map((value, i) => (i === n ? e.target.value : value)))}
                className={cn(controlClass, 'mt-1 font-mono tabular-nums uppercase')}
              />
            </div>
          ))}
        </div>
      </fieldset>

      <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-0.5 size-4 accent-[rgb(var(--accent))]" />
        <span>Saya sudah menyimpan kunci pemulihan ini di tempat yang aman. Saya paham tidak bisa melihatnya lagi.</span>
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm text-status-overdue">
          {error}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button variant="primary" disabled={!ready} onClick={onConfirm}>
          {busy ? 'Menyimpan…' : confirmLabel}
        </Button>
        {secondary}
      </div>
    </div>
  )
}
