// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useNewNoteShortcut } from './useNewNoteShortcut'

const press = (target: Element | Window, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true, cancelable: true, ...init }))

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useNewNoteShortcut', () => {
  it('creates a note on N from the page', () => {
    const create = vi.fn()
    renderHook(() => useNewNoteShortcut(create))
    press(document.body)
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('stays out of the way inside inputs and the editor', () => {
    const create = vi.fn()
    renderHook(() => useNewNoteShortcut(create))
    const input = document.body.appendChild(document.createElement('input'))
    const editable = document.body.appendChild(document.createElement('div'))
    // jsdom does not implement isContentEditable, so it is set directly.
    Object.defineProperty(editable, 'isContentEditable', { value: true })
    press(input)
    press(editable)
    expect(create).not.toHaveBeenCalled()
  })

  it('ignores N with a modifier key', () => {
    const create = vi.fn()
    renderHook(() => useNewNoteShortcut(create))
    press(document.body, { ctrlKey: true })
    press(document.body, { metaKey: true })
    expect(create).not.toHaveBeenCalled()
  })
})
