import { useUiStore } from '@/stores/ui'
import type { DueReminder } from '@/lib/reminders'

export type Delivery = 'system' | 'toast'

/**
 * Shows one reminder. With the browser's permission it is a system notification; without it, or when the browser
 * refuses the constructor, it is the in-app toast, so a reminder is never lost just because notifications are off.
 */
export function deliverReminder(reminder: DueReminder): Delivery {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(reminder.title, { body: reminder.body, tag: reminder.key })
      return 'system'
    } catch {
      // Some browsers only allow notifications from a service worker. Fall through to the toast.
    }
  }
  useUiStore.getState().showToast(`${reminder.title}: ${reminder.body}`)
  return 'toast'
}
