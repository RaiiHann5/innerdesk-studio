// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTypingTarget, matchesKeyCombo, useKeyHotkey } from './hotkeys'

const press = (target: Element | Window, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'L', shiftKey: true, bubbles: true, cancelable: true, ...init }))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('matchesKeyCombo', () => {
  it('needs the exact modifiers', () => {
    const e = { key: 'L', metaKey: false, ctrlKey: false, altKey: false, shiftKey: true }
    expect(matchesKeyCombo(e, { key: 'L', shift: true })).toBe(true)
    expect(matchesKeyCombo({ ...e, shiftKey: false }, { key: 'L', shift: true })).toBe(false)
    expect(matchesKeyCombo({ ...e, ctrlKey: true }, { key: 'L', shift: true })).toBe(false)
    expect(matchesKeyCombo({ ...e, key: 'l', shiftKey: false }, { key: 'L', shift: true })).toBe(false)
  })
})

describe('useKeyHotkey', () => {
  it('fires on the combo and stays quiet while typing, repeating, disabled or inside another shortcut', () => {
    const handler = vi.fn()
    const { rerender } = renderHook(({ enabled }) => useKeyHotkey({ key: 'L', shift: true }, handler, enabled), { initialProps: { enabled: true } })

    press(window)
    expect(handler).toHaveBeenCalledTimes(1)

    const input = document.body.appendChild(document.createElement('input'))
    press(input)
    const area = document.body.appendChild(document.createElement('textarea'))
    press(area)
    press(window, { repeat: true })
    press(window, { ctrlKey: true })
    expect(handler).toHaveBeenCalledTimes(1)

    rerender({ enabled: false })
    press(window)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('treats inputs, textareas, selects and editable elements as typing', () => {
    const div = document.createElement('div')
    div.contentEditable = 'true'
    Object.defineProperty(div, 'isContentEditable', { value: true })
    expect(isTypingTarget(div)).toBe(true)
    expect(isTypingTarget(document.createElement('select'))).toBe(true)
    expect(isTypingTarget(document.createElement('button'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
