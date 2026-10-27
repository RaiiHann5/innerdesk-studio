import { useCallback } from 'react'

/**
 * Ask once, and only from a real click. A permission prompt that appears unasked is one people
 * dismiss, so this is called from the Start button rather than from an effect.
 */
export function useFocusNotifications() {
  const request = useCallback(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'default') return
    void Notification.requestPermission()
  }, [])

  const notify = useCallback((title: string, body: string) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    try {
      new Notification(title, { body, tag: 'ruang-focus' })
    } catch {
      // Some browsers only allow notifications from a service worker. Saying nothing is correct.
    }
  }, [])

  return { request, notify }
}

/** Whether the browser will let us notify at all, so the UI can say so instead of silently doing nothing. */
export function notificationsBlocked(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'denied'
}