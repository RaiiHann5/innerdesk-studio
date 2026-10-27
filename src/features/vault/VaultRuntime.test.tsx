// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { VaultRuntime } from './VaultRuntime'
import { useVaultStore } from './store/vaultStore'

vi.setConfig({ testTimeout: 90_000, hookTimeout: 90_000 })

const PASSWORD = 'correct horse battery staple'
const MIN = 60_000
const state = () => useVaultStore.getState()

function Nav() {
  const navigate = useNavigate()
  return (
    <>
      <button onClick={() => navigate('/dashboard')}>away</button>
      <button onClick={() => navigate('/vault')}>back</button>
    </>
  )
}

const setVisibility = (value: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value })
  document.dispatchEvent(new Event('visibilitychange'))
}

const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms) })

beforeAll(async () => {
  if (!globalThis.crypto?.subtle) vi.stubGlobal('crypto', webcrypto)
  await state().init()
  await state().beginSetup(PASSWORD)
  await state().confirmSetup()
  state().lock('manual')
})

beforeEach(async () => {
  // Real timers while the key is derived; fake ones only for the clock under test.
  if (state().status !== 'unlocked') expect((await state().unlock(PASSWORD)).ok).toBe(true)
  setVisibility('visible')
  vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval', 'setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  state().lock('manual')
})

const mount = (path = '/vault') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <VaultRuntime />
      <Nav />
    </MemoryRouter>,
  )

describe('auto-lock', () => {
  it('locks after 5 minutes without activity and says why', async () => {
    mount()
    await advance(5 * MIN - 10_000)
    expect(state().status).toBe('unlocked')
    await advance(15_000)
    expect(state().status).toBe('locked')
    expect(state().lockReason).toBe('idle')
    expect(screen.getByRole('status').textContent).toContain('5 menit tanpa aktivitas')
    expect(state().items).toEqual([])
  })

  it('counts activity on the vault page as presence', async () => {
    mount()
    await advance(4 * MIN)
    fireEvent.pointerDown(window)
    await advance(4 * MIN)
    expect(state().status).toBe('unlocked')
    await advance(1.5 * MIN)
    expect(state().status).toBe('locked')
  })

  it('locks when the tab stays hidden for 2 minutes, not for less', async () => {
    mount()
    setVisibility('hidden')
    await advance(MIN + 30_000)
    expect(state().status).toBe('unlocked')
    await advance(40_000)
    expect(state().status).toBe('locked')
    expect(state().lockReason).toBe('hidden')
  })

  it('locks on return when the hidden time passed while timers were throttled', async () => {
    mount()
    setVisibility('hidden')
    vi.setSystemTime(Date.now() + 3 * MIN)
    setVisibility('visible')
    expect(state().status).toBe('locked')
    expect(state().lockReason).toBe('hidden')
  })

  it('keeps counting while the person is on another page, so coming back after the limit finds it locked', async () => {
    mount()
    fireEvent.click(screen.getByText('away'))
    await advance(6 * MIN)
    expect(state().status).toBe('locked')
    fireEvent.click(screen.getByText('back'))
    expect(state().status).toBe('locked')
  })

  it('stays open when the person returns within the limit, and the clock restarts', async () => {
    mount()
    fireEvent.click(screen.getByText('away'))
    await advance(3 * MIN)
    fireEvent.click(screen.getByText('back'))
    await advance(3 * MIN)
    expect(state().status).toBe('unlocked')
    await advance(2.5 * MIN)
    expect(state().status).toBe('locked')
  })

  it('locks when the system clock jumps backwards', async () => {
    mount()
    vi.setSystemTime(Date.now() - 10 * MIN)
    await advance(6000)
    expect(state().status).toBe('locked')
  })

  it('locks when another tab changes the vault', async () => {
    mount()
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'pos:v1:vault-meta' }))
    })
    expect(state().lockReason).toBe('external')
    expect(state().status).not.toBe('unlocked')
  })

  it('ignores storage changes that are not the vault', async () => {
    mount()
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'pos:ui' }))
    })
    expect(state().status).toBe('unlocked')
  })

  it('locks on Shift+L from any page', async () => {
    mount('/dashboard')
    fireEvent.keyDown(window, { key: 'L', shiftKey: true })
    expect(state().status).toBe('locked')
    expect(state().lockReason).toBe('manual')
  })
})
