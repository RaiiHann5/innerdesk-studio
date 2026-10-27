/**
 * Browser notifications for the end of a block.
 *
 * Everything here degrades to nothing: a browser without the API, a denied permission or a
 * context that refuses `new Notification` all leave the timer exactly as it was.
 */

/** Ask once, and only from a real click, so the prompt is tied to a deliberate Start. */
export function requestNotificationPermission(): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
  void Notification.requestPermission()
}

export function notify(title: string, body: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, tag: 'innerdesk-focus' })
  } catch {
    // Some browsers only allow notifications from a service worker. Saying nothing is correct.
  }
}

/** Whether the browser will refuse, so the UI can say so instead of silently doing nothing. */
export function notificationsBlocked(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'denied'
}
