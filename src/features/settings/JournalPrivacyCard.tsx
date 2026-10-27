import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { Switch } from '@/components/ui/Switch'
import { PRIVACY_NOTE } from '@/features/journal/privacy/PrivacyLock'
import { useLockStore } from '@/features/journal/privacy/lockStore'
import { PIN_PATTERN, createPin } from '@/features/journal/privacy/pin'
import { Link } from 'react-router-dom'

export function JournalPrivacyCard() {
  const { enabled, pin, lockOnHide, unlocked, enable, disable, setPin, setLockOnHide } = useLockStore()
  const [draft, setDraft] = useState('')
  const [saved, setSaved] = useState(false)
  // Once the journal is locked, these controls wait for it to be opened, or the lock could be switched off from here.
  const blocked = enabled && !unlocked
  const valid = PIN_PATTERN.test(draft)

  const savePin = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    setPin(await createPin(draft))
    setDraft('')
    setSaved(true)
  }

  return (
    <section aria-labelledby="privacy-title" className="rounded-card border bg-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="privacy-title" className="font-display text-md font-bold tracking-tight">
            Kunci jurnal
          </h2>
          <p className="mt-1 text-sm text-muted">
            Menyamarkan daftar tanggal dan isi jurnal di layar sampai kamu membukanya, dengan satu klik atau dengan PIN.
          </p>
        </div>
        <Switch checked={enabled} onChange={(on) => (on ? enable() : disable())} labelledBy="privacy-title" disabled={blocked} />
      </div>

      <p className="mt-3 rounded-control bg-sunken px-3 py-2 text-sm">
        {PRIVACY_NOTE} Siapa pun yang bisa membuka browser atau data situs ini tetap bisa membaca jurnalmu.
      </p>

      {blocked && (
        <p className="mt-3 text-sm text-muted">
          Jurnal sedang terkunci. <Link to="/journal" className="text-accent-text underline underline-offset-2">Buka dulu di halaman Jurnal</Link> untuk mengubah pengaturan ini.
        </p>
      )}

      {enabled && !blocked && (
        <div className="mt-4 space-y-5">
          <form onSubmit={(e) => void savePin(e)} className="space-y-2">
            <Field
              label={pin ? 'Ganti PIN' : 'PIN (opsional)'}
              htmlFor="journal-pin"
              hint={pin ? 'PIN sudah diatur. Isi PIN baru untuk menggantinya.' : 'Empat sampai delapan angka. Tanpa PIN, jurnal dibuka dengan satu klik.'}
            >
              <input
                id="journal-pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value.replace(/\D/g, ''))
                  setSaved(false)
                }}
                className={`${controlClass} max-w-48 tracking-widest`}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" disabled={!valid}>
                {pin ? 'Ganti PIN' : 'Atur PIN'}
              </Button>
              {pin && (
                <Button
                  onClick={() => {
                    setPin(null)
                    setSaved(false)
                  }}
                >
                  Hapus PIN
                </Button>
              )}
              <p role="status" className="text-sm text-muted">
                {saved ? 'PIN disimpan.' : ''}
              </p>
            </div>
          </form>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p id="lock-hide-title" className="text-sm font-medium">
                Kunci saat tab ditinggalkan
              </p>
              <p className="mt-0.5 text-xs text-muted">Jurnal terkunci lagi setiap kali kamu pindah tab atau aplikasi.</p>
            </div>
            <Switch checked={lockOnHide} onChange={setLockOnHide} labelledBy="lock-hide-title" />
          </div>
        </div>
      )}
    </section>
  )
}
