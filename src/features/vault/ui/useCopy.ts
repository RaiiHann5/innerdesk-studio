import { useCallback, useEffect, useRef, useState } from 'react'
import { CLIPBOARD_CLEAR_MS, copyWithAutoClear, type CopyHandle } from '@/lib/clipboard'

/** One clipboard clear at a time, for the whole app: a new copy replaces the previous countdown. */
let active: CopyHandle | null = null

export interface CopyStatus {
  label: string
  secondsLeft: number
  /** Set once the clear attempt has run. */
  outcome: 'pending' | 'cleared' | 'failed' | 'error'
}

/**
 * Copies a value and tracks the best-effort clear. The clear keeps running if the component goes away,
 * because leaving the page is exactly when a copied secret should still be cleaned up.
 */
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const copy = useCallback(async (label: string, value: string) => {
    const update = (next: CopyStatus | null) => mounted.current && setStatus(next)
    active?.cancel()
    try {
      update({ label, secondsLeft: CLIPBOARD_CLEAR_MS / 1000, outcome: 'pending' })
      const handle = await copyWithAutoClear(value, { onTick: (secondsLeft) => update({ label, secondsLeft, outcome: 'pending' }) })
      active = handle
      void handle.done.then((outcome) => {
        if (active === handle) active = null
        if (outcome === 'kept') return update(null)
        update({ label, secondsLeft: 0, outcome })
      })
    } catch {
      update({ label, secondsLeft: 0, outcome: 'error' })
    }
  }, [])

  return { status, copy }
}

/** Plain-language text for the status. The countdown number itself is kept out of the live region. */
export function copyStatusText(status: CopyStatus): string {
  switch (status.outcome) {
    case 'pending':
      return `${status.label} disalin. Papan klip dibersihkan otomatis dalam 20 detik (upaya terbaik, tidak dijamin).`
    case 'cleared':
      return 'Papan klip sudah dibersihkan.'
    case 'failed':
      return 'Papan klip tidak bisa dibersihkan otomatis. Salin hal lain untuk menimpanya.'
    case 'error':
      return 'Tidak bisa menyalin ke papan klip.'
  }
}
