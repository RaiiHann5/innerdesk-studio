import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { copyWithAutoClear } from './clipboard'

let clipboard: { text: string; readFails: boolean; writeFailsOnClear: boolean }

beforeEach(() => {
  vi.useFakeTimers()
  clipboard = { text: '', readFails: false, writeFailsOnClear: false }
  vi.stubGlobal('navigator', {
    clipboard: {
      writeText: async (value: string) => {
        if (value === '' && clipboard.writeFailsOnClear) throw new Error('not focused')
        clipboard.text = value
      },
      readText: async () => {
        if (clipboard.readFails) throw new Error('denied')
        return clipboard.text
      },
    },
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('copyWithAutoClear', () => {
  it('copies, counts down, and clears after 20 seconds', async () => {
    const ticks: number[] = []
    const handle = await copyWithAutoClear('s3cret', { onTick: (n) => ticks.push(n) })
    expect(clipboard.text).toBe('s3cret')
    await vi.advanceTimersByTimeAsync(19_000)
    expect(clipboard.text).toBe('s3cret')
    await vi.advanceTimersByTimeAsync(1_000)
    expect(await handle.done).toBe('cleared')
    expect(clipboard.text).toBe('')
    expect(ticks[0]).toBe(20)
    expect(ticks.at(-1)).toBe(0)
  })

  it('leaves the clipboard alone when the person copied something else meanwhile', async () => {
    const handle = await copyWithAutoClear('s3cret')
    clipboard.text = 'something else'
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await handle.done).toBe('kept')
    expect(clipboard.text).toBe('something else')
  })

  it('clears anyway when the clipboard cannot be read, and reports failure when it cannot be written', async () => {
    clipboard.readFails = true
    const first = await copyWithAutoClear('s3cret')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await first.done).toBe('cleared')

    clipboard.writeFailsOnClear = true
    const second = await copyWithAutoClear('s3cret')
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await second.done).toBe('failed')
    expect(clipboard.text).toBe('s3cret')
  })

  it('can be cancelled without touching the clipboard', async () => {
    const handle = await copyWithAutoClear('s3cret')
    handle.cancel()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(await handle.done).toBe('kept')
    expect(clipboard.text).toBe('s3cret')
  })

  it('rejects when the copy itself is refused', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('denied') } } })
    await expect(copyWithAutoClear('x')).rejects.toThrow()
  })
})
