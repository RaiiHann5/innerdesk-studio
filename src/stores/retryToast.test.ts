import { beforeEach, describe, expect, it, vi } from 'vitest'
import { toastWithRetry } from './retryToast'
import { useUiStore } from './ui'

const toast = () => useUiStore.getState().toast
/** What the Toast component does when its button is pressed: run the action, then clear the toast. */
const press = () => {
  toast()?.action?.run()
  useUiStore.getState().clearToast()
}

beforeEach(() => useUiStore.setState({ toast: null }))

describe('toastWithRetry', () => {
  it('shows the message with a "Coba lagi" action that runs the work', async () => {
    const retry = vi.fn().mockResolvedValue(undefined)
    toastWithRetry('Gagal menyimpan.', retry)
    expect(toast()?.message).toBe('Gagal menyimpan.')
    expect(toast()?.action?.label).toBe('Coba lagi')
    press()
    await vi.waitFor(() => expect(retry).toHaveBeenCalledTimes(1))
    expect(toast()).toBeNull()
  })

  it('offers again when the retry fails too, and stops once it works', async () => {
    const retry = vi.fn().mockRejectedValueOnce(new Error('masih putus')).mockResolvedValue(undefined)
    toastWithRetry('Gagal menyimpan.', retry)
    press()
    await vi.waitFor(() => expect(toast()?.message).toBe('Gagal menyimpan.'))
    press()
    await vi.waitFor(() => expect(retry).toHaveBeenCalledTimes(2))
    expect(toast()).toBeNull()
  })

  it('also covers work that throws before it returns a promise', async () => {
    toastWithRetry('Gagal.', () => {
      throw new Error('langsung gagal')
    })
    press()
    await vi.waitFor(() => expect(toast()?.action?.label).toBe('Coba lagi'))
  })
})
