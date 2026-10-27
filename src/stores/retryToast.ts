import { useUiStore } from '@/stores/ui'

/**
 * Says that something failed and offers to run it again. If the retry fails too, it offers again, so how many
 * times to try is the person's call. Pass the work itself, not a stale result: it runs from scratch each time.
 */
export function toastWithRetry(message: string, retry: () => Promise<unknown> | void): void {
  useUiStore.getState().showToast(message, {
    label: 'Coba lagi',
    run: () => {
      void Promise.resolve()
        .then(retry)
        .catch(() => toastWithRetry(message, retry))
    },
  })
}
