import { beforeEach, describe, expect, it } from 'vitest'
import { useLockStore } from './lockStore'

const state = () => useLockStore.getState()
const isLocked = () => state().enabled && !state().unlocked

beforeEach(() => useLockStore.setState({ enabled: false, pin: null, lockOnHide: false, unlocked: false }))

describe('lockStore', () => {
  it('is never locked while the setting is off', () => {
    expect(isLocked()).toBe(false)
  })

  it('stays open for the session that turned it on, then locks on demand', () => {
    state().enable()
    expect(isLocked()).toBe(false)
    state().lock()
    expect(isLocked()).toBe(true)
    state().unlock()
    expect(isLocked()).toBe(false)
  })

  it('a fresh load of an enabled lock starts locked', () => {
    useLockStore.setState({ enabled: true, unlocked: false })
    expect(isLocked()).toBe(true)
  })

  it('turning it off forgets the PIN and the hide option', () => {
    state().enable()
    state().setPin({ salt: 'a', hash: 'b' })
    state().setLockOnHide(true)
    state().disable()
    expect(state()).toMatchObject({ enabled: false, pin: null, lockOnHide: false })
  })
})
