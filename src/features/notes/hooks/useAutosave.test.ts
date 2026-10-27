// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave'

type Save = (id: string, value: string) => Promise<void>

const setup = (save: Save, id = 'a') =>
  renderHook((props: { id: string }) => useAutosave<string>({ id: props.id, save }), { initialProps: { id } })

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useAutosave', () => {
  it('waits for typing to pause, then saves only the last value', async () => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result } = setup(save)

    act(() => result.current.schedule('s'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 100))
    act(() => result.current.schedule('sa'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 100))
    expect(save).not.toHaveBeenCalled()
    expect(result.current.status).toBe('saving')

    await act(() => vi.advanceTimersByTimeAsync(100))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('a', 'sa')
    expect(result.current.status).toBe('saved')
    expect(result.current.savedAt).toBeDefined()
  })

  it('flush saves right away and leaves nothing for the timer', async () => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result } = setup(save)

    act(() => result.current.schedule('draf'))
    await act(() => result.current.flush())
    expect(save).toHaveBeenCalledWith('a', 'draf')

    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2))
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flushes a waiting change on unmount', async () => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result, unmount } = setup(save)

    act(() => result.current.schedule('belum tersimpan'))
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledWith('a', 'belum tersimpan')
  })

  it.each(['pagehide', 'beforeunload'])('flushes on %s', async (type) => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result } = setup(save)

    act(() => result.current.schedule('tutup tab'))
    act(() => void window.dispatchEvent(new Event(type)))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledWith('a', 'tutup tab')
  })

  it('never writes one note into another when the id changes', async () => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result, rerender } = setup(save, 'a')

    act(() => result.current.schedule('isi A'))
    rerender({ id: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('a', 'isi A')

    act(() => result.current.schedule('isi B'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
    expect(save.mock.calls).toEqual([
      ['a', 'isi A'],
      ['b', 'isi B'],
    ])
  })

  it('keeps showing the new note as idle while the old note finishes saving', async () => {
    let finish!: () => void
    const save = vi.fn<Save>(() => new Promise<void>((resolve) => (finish = resolve)))
    const { result, rerender } = setup(save, 'a')

    act(() => result.current.schedule('isi A'))
    rerender({ id: 'b' })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(save).toHaveBeenCalledWith('a', 'isi A')
    expect(result.current.status).toBe('idle')
    await act(async () => finish())
    expect(result.current.status).toBe('idle')
  })

  it('runs saves one after another, in order', async () => {
    const order: string[] = []
    const resolvers: Array<() => void> = []
    const save = vi.fn<Save>((_id, value) => {
      order.push(`start ${value}`)
      return new Promise<void>((resolve) => resolvers.push(() => (order.push(`end ${value}`), resolve())))
    })
    const { result } = setup(save)

    act(() => result.current.schedule('satu'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
    act(() => result.current.schedule('dua'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
    expect(order).toEqual(['start satu'])

    await act(async () => resolvers[0]())
    await act(async () => resolvers[1]())
    expect(order).toEqual(['start satu', 'end satu', 'start dua', 'end dua'])
  })

  it('shows an error, then saves the same change again on retry', async () => {
    const save = vi.fn<Save>().mockRejectedValueOnce(new Error('gagal')).mockResolvedValue()
    const { result } = setup(save)

    act(() => result.current.schedule('penting'))
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS))
    expect(result.current.status).toBe('error')

    await act(() => result.current.retry())
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith('a', 'penting')
    expect(result.current.status).toBe('saved')
  })

  it('cancel drops a waiting change, for a note that is being deleted', async () => {
    const save = vi.fn<Save>().mockResolvedValue()
    const { result, unmount } = setup(save)

    act(() => result.current.schedule('tidak perlu'))
    act(() => result.current.cancel())
    unmount()
    await act(() => vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS * 2))
    expect(save).not.toHaveBeenCalled()
  })
})
