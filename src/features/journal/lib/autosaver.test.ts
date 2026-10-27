import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosaver } from './autosaver'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createAutosaver', () => {
  it('saves once, with the latest value, after the quiet period', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const saver = createAutosaver<string>({ delay: 600, save })
    saver.schedule('a')
    await vi.advanceTimersByTimeAsync(400)
    saver.schedule('ab')
    await vi.advanceTimersByTimeAsync(599)
    expect(save).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('ab')
    expect(saver.getStatus()).toBe('saved')
  })

  it('flush saves right away and starts the save synchronously', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const saver = createAutosaver<string>({ delay: 600, save })
    saver.schedule('x')
    void saver.flush()
    expect(save).toHaveBeenCalledWith('x')
    expect(saver.hasPending()).toBe(false)
  })

  it('flush with nothing pending does not save', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const saver = createAutosaver<string>({ delay: 600, save })
    await saver.flush()
    expect(save).not.toHaveBeenCalled()
    expect(saver.getStatus()).toBe('idle')
  })

  it('never overlaps saves and ends on the newest value', async () => {
    const order: string[] = []
    let release: () => void = () => {}
    const save = vi.fn(async (value: string) => {
      order.push(`start ${value}`)
      if (value === 'one') await new Promise<void>((resolve) => (release = resolve))
      order.push(`end ${value}`)
    })
    const saver = createAutosaver<string>({ delay: 10, save })
    saver.schedule('one')
    const first = saver.flush()
    saver.schedule('two')
    const second = saver.flush()
    expect(order).toEqual(['start one'])
    release()
    await Promise.all([first, second])
    expect(order).toEqual(['start one', 'end one', 'start two', 'end two'])
    expect(saver.getStatus()).toBe('saved')
  })

  it('keeps a failed value and retries it on the next flush', async () => {
    const save = vi.fn().mockRejectedValueOnce(new Error('penuh')).mockResolvedValue(undefined)
    const saver = createAutosaver<string>({ delay: 10, save })
    saver.schedule('teks')
    await saver.flush()
    expect(saver.getStatus()).toBe('error')
    expect(saver.hasPending()).toBe(true)
    await saver.flush()
    expect(save).toHaveBeenLastCalledWith('teks')
    expect(saver.getStatus()).toBe('saved')
  })

  it('a newer edit wins over a failed older value', async () => {
    let fail = true
    const save = vi.fn(async () => {
      if (fail) {
        saver.schedule('baru')
        throw new Error('gagal')
      }
    })
    const saver = createAutosaver<string>({ delay: 10, save })
    saver.schedule('lama')
    await saver.flush()
    fail = false
    await saver.flush()
    expect(save).toHaveBeenLastCalledWith('baru')
  })

  it('cancel drops the waiting value so it cannot be saved later', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    const saver = createAutosaver<string>({ delay: 600, save })
    saver.schedule('x')
    saver.cancel()
    await vi.advanceTimersByTimeAsync(1000)
    await saver.flush()
    expect(save).not.toHaveBeenCalled()
    expect(saver.getStatus()).toBe('idle')
  })

  it('notifies subscribers on status changes only', async () => {
    const saver = createAutosaver<string>({ delay: 10, save: async () => {} })
    const listener = vi.fn()
    saver.subscribe(listener)
    saver.schedule('a')
    saver.schedule('b')
    expect(listener).toHaveBeenCalledTimes(1)
    await saver.flush()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('cancel then flush still waits for a save that is already running', async () => {
    let release: () => void = () => {}
    const done = vi.fn()
    const saver = createAutosaver<string>({
      delay: 10,
      save: () => new Promise<void>((resolve) => (release = resolve)),
    })
    saver.schedule('x')
    void saver.flush()
    saver.cancel()
    const settled = saver.flush().then(done)
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    release()
    await settled
    expect(done).toHaveBeenCalled()
  })
})
