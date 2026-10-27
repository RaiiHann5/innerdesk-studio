import { useCallback, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useKeyHotkey } from '@/lib/hotkeys'
import { dueLockReason, type AutoLockState } from './lib/autoLock'
import { useVaultPrefs } from './store/vaultPrefs'
import { useVaultStore } from './store/vaultStore'

const META_STORAGE_KEY = 'pos:v1:vault-meta'
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/**
 * Mounted once in the app shell. Renders nothing visible; it enforces when the vault locks and announces it.
 *
 * Idle time only counts activity on the vault page: leaving the page starts the clock, and coming back
 * after the limit finds it locked. The tab being hidden for 2 minutes locks it as well.
 */
export function VaultRuntime() {
  const { pathname } = useLocation()
  const onVault = pathname.startsWith('/vault')
  const unlocked = useVaultStore((s) => s.status === 'unlocked')
  const announcement = useVaultStore((s) => s.announcement)
  const lock = useVaultStore((s) => s.lock)
  const idleMinutes = useVaultPrefs((s) => s.autoLockMinutes)
  const activity = useRef<AutoLockState>({ lastActivityAt: Date.now(), hiddenSince: null })

  const check = useCallback(() => {
    const reason = dueLockReason(activity.current, Date.now(), idleMinutes)
    if (reason) lock(reason, idleMinutes)
    return reason !== null
  }, [idleMinutes, lock])

  // A fresh unlock starts a fresh clock.
  useEffect(() => {
    if (unlocked) activity.current = { lastActivityAt: Date.now(), hiddenSince: document.visibilityState === 'hidden' ? Date.now() : null }
  }, [unlocked])

  // Activity on the vault page. Arriving checks first, so an expired session is locked before it counts as activity.
  useEffect(() => {
    if (!unlocked || !onVault) return
    if (check()) return
    let lastMove = 0
    const touch = () => {
      activity.current.lastActivityAt = Date.now()
    }
    const onMove = () => {
      const now = Date.now()
      if (now - lastMove > 1000) {
        lastMove = now
        touch()
      }
    }
    touch()
    for (const name of ACTIVITY_EVENTS) window.addEventListener(name, touch, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, touch)
      window.removeEventListener('pointermove', onMove)
      touch() // leaving the page is the last activity
    }
  }, [unlocked, onVault, check])

  // Checked on a timer, wherever the person is in the app, because timers are throttled in background tabs.
  useEffect(() => {
    if (!unlocked) return
    const timer = window.setInterval(check, 5000)
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        activity.current.hiddenSince = Date.now()
        return
      }
      if (!check()) activity.current.hiddenSince = null
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [unlocked, check])

  // Another tab created, changed or rotated the vault: this tab's view is stale, so it locks and reloads.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== META_STORAGE_KEY || useVaultStore.getState().status === 'loading') return
      useVaultStore.getState().lock('external', idleMinutes)
      void useVaultStore.getState().init()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [idleMinutes])

  const lockNow = useCallback(() => lock('manual', idleMinutes), [lock, idleMinutes])
  useKeyHotkey({ key: 'L', shift: true }, lockNow, unlocked)

  return (
    <div role="status" aria-live="polite" className="sr-only">
      {announcement}
    </div>
  )
}
