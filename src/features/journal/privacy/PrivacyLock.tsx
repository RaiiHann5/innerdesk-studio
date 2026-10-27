import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { LockSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { controlClass } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { useIsLocked, useLockStore } from './lockStore'
import { verifyPin } from './pin'

export const PRIVACY_NOTE =
  'Ini penyamaran layar, bukan enkripsi. Isi jurnal tetap tersimpan apa adanya di perangkat ini.'

function LockOverlay() {
  const pin = useLockStore((s) => s.pin)
  const unlock = useLockStore((s) => s.unlock)
  const [value, setValue] = useState('')
  const [wrong, setWrong] = useState(false)
  const [checking, setChecking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // The overlay is the only thing on the page that can take focus, so it takes it.
  useEffect(() => {
    ;(inputRef.current ?? buttonRef.current)?.focus()
  }, [])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pin) return unlock()
    setChecking(true)
    const ok = await verifyPin(value, pin)
    setChecking(false)
    if (ok) return unlock()
    setWrong(true)
    setValue('')
    inputRef.current?.focus()
  }

  return (
    <div className="absolute inset-0 z-10 flex items-start justify-center px-4 pt-16 md:pt-24">
      <form
        onSubmit={(e) => void submit(e)}
        role="group"
        aria-labelledby="lock-title"
        className="w-full max-w-sm rounded-card border bg-surface p-5 shadow-lift"
      >
        <LockSimple size={24} aria-hidden className="text-muted" />
        <h2 id="lock-title" className="mt-3 font-display text-lg font-bold tracking-tight">
          Jurnal terkunci
        </h2>
        <p className="mt-1 text-sm text-muted">{pin ? 'Masukkan PIN untuk menampilkan jurnal.' : 'Tekan tombol untuk menampilkan jurnal.'}</p>
        {pin && (
          <div className="mt-4 space-y-1.5">
            <label htmlFor="lock-pin" className="text-sm font-medium">
              PIN
            </label>
            <input
              ref={inputRef}
              id="lock-pin"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={8}
              value={value}
              aria-invalid={wrong}
              aria-describedby={wrong ? 'lock-error' : undefined}
              onChange={(e) => {
                setValue(e.target.value.replace(/\D/g, ''))
                setWrong(false)
              }}
              className={cn(controlClass, 'tracking-widest', wrong && 'border-status-overdue')}
            />
            {wrong && (
              <p id="lock-error" role="alert" className="text-xs text-status-overdue">
                PIN salah. Coba lagi.
              </p>
            )}
          </div>
        )}
        <Button ref={buttonRef} type="submit" variant="primary" disabled={checking || (pin !== null && value.length < 4)} className="mt-4 w-full">
          {pin ? 'Buka' : 'Tampilkan jurnal'}
        </Button>
        <p className="mt-4 text-xs text-muted">{PRIVACY_NOTE}</p>
      </form>
    </div>
  )
}

/** Blurs and disables everything inside while the journal is locked, and shows the unlock form over it. */
export function PrivacyLock({ children }: { children: ReactNode }) {
  const locked = useIsLocked()
  const lockOnHide = useLockStore((s) => s.enabled && s.lockOnHide)
  const lock = useLockStore((s) => s.lock)

  useEffect(() => {
    if (!lockOnHide) return
    const onVisibility = () => document.visibilityState === 'hidden' && lock()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [lockOnHide, lock])

  return (
    <div className={cn('relative', locked && 'min-h-[32rem] overflow-hidden')}>
      <div
        aria-hidden={locked || undefined}
        // `inert` keeps keyboard focus and screen readers out of the hidden text. React 18 has no prop for it yet.
        {...(locked ? { inert: '' } : {})}
        className={cn(locked && 'pointer-events-none select-none blur-md')}
      >
        {children}
      </div>
      {locked && <LockOverlay />}
    </div>
  )
}
