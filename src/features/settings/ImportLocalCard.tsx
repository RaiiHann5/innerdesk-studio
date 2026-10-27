import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { importLocalData, type ImportLine } from '@/data/repos/migrate/importLocalData'
import { BACKEND } from '@/lib/supabase'

export function ImportLocalCard() {
  const [running, setRunning] = useState(false)
  const [step, setStep] = useState('')
  const [report, setReport] = useState<ImportLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (BACKEND !== 'supabase') return null

  const run = async () => {
    setRunning(true)
    setError(null)
    setReport(null)
    try {
      setReport(await importLocalData(setStep))
    } catch {
      setError('Impor berhenti sebelum selesai. Coba lagi: yang sudah masuk akan dilewati.')
    } finally {
      setRunning(false)
    }
  }
  const shown = report?.filter((l) => l.imported + l.skipped + l.failed > 0) ?? []

  return (
    <section aria-labelledby="import-title" className="rounded-card border bg-surface p-4 md:p-5">
      <h2 id="import-title" className="font-display text-md font-bold tracking-tight">
        Impor data dari perangkat ini
      </h2>
      <p className="mt-1 text-sm text-muted">
        Menyalin data yang tersimpan di browser ini ke akunmu, lengkap dengan id dan waktu aslinya. Aman diulang: data yang sudah ada dilewati dan tidak ditimpa. Data di browser tidak dihapus.
      </p>
      <Button className="mt-3" onClick={() => void run()} disabled={running}>
        {running ? `Mengimpor ${step}…` : 'Impor sekarang'}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-status-overdue">
          {error}
        </p>
      )}
      {report && (
        <div role="status" className="mt-3 text-sm">
          {shown.length === 0 ? (
            <p className="text-muted">Tidak ada data lokal yang perlu diimpor.</p>
          ) : (
            <ul className="space-y-1">
              {shown.map((l) => (
                <li key={l.label}>
                  <span className="font-medium">{l.label}</span>: {l.imported} masuk, {l.skipped} dilewati{l.failed > 0 && <span className="text-status-overdue">, {l.failed} gagal</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-muted">Muat ulang halaman untuk melihat hasilnya.</p>
        </div>
      )}
    </section>
  )
}
