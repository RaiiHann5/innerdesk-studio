// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useCallback, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SheetPanel } from './SheetPanel'

afterEach(cleanup)

// jsdom has no layout, so offsetParent is always null; the trap skips elements it thinks are hidden.
vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
  return this.parentElement
})

function Harness({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false)
  const close = useCallback(() => {
    setOpen(false)
    onClosed?.()
  }, [onClosed])
  return (
    <>
      <button onClick={() => setOpen(true)}>Buka</button>
      <SheetPanel open={open} onClose={close} label="Task TSK-1" headerExtra={<p>Tersimpan</p>}>
        <input aria-label="Judul" />
        <button>Simpan</button>
      </SheetPanel>
    </>
  )
}
const openPanel = () => {
  const opener = screen.getByRole('button', { name: 'Buka' })
  opener.focus()
  fireEvent.click(opener)
  return opener
}

describe('SheetPanel focus management', () => {
  it('is a labelled modal dialog and moves focus into itself on open', () => {
    render(<Harness />)
    openPanel()
    const dialog = screen.getByRole('dialog', { name: 'Task TSK-1' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(dialog)
    expect(screen.getByText('Tersimpan')).toBeTruthy()
  })

  it('keeps Tab inside the panel in both directions', () => {
    render(<Harness />)
    openPanel()
    const close = screen.getByRole('button', { name: 'Tutup panel' })
    const save = screen.getByRole('button', { name: 'Simpan' })
    save.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(close)
    close.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(save)
  })

  it('pulls focus back in if it has strayed outside the panel', () => {
    render(<Harness />)
    const opener = openPanel()
    opener.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
  })

  it('closes on Escape and gives focus back to what opened it', () => {
    const onClosed = vi.fn()
    render(<Harness onClosed={onClosed} />)
    const opener = openPanel()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClosed).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it('exposes one close button to assistive technology, not two', () => {
    render(<Harness />)
    openPanel()
    expect(screen.getAllByRole('button', { name: 'Tutup panel' })).toHaveLength(1)
  })

  it('closes from the scrim and from the close button', () => {
    const onClosed = vi.fn()
    render(<Harness onClosed={onClosed} />)
    openPanel()
    fireEvent.click(document.querySelector('button[aria-hidden="true"]') as HTMLElement)
    expect(onClosed).toHaveBeenCalledTimes(1)
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Tutup panel' }))
    expect(onClosed).toHaveBeenCalledTimes(2)
  })

  it('drops its margin, so a space-y parent cannot push the fixed layers down', () => {
    render(<Harness />)
    openPanel()
    expect(screen.getByRole('dialog').className).toContain('!m-0')
    expect((document.querySelector('button[aria-hidden="true"]') as HTMLElement).className).toContain('!m-0')
  })

  it('is a bottom sheet when asked, and a wider drawer otherwise', () => {
    const { rerender } = render(<SheetPanel open onClose={() => {}} label="A" wide>
        <p>isi</p>
      </SheetPanel>)
    expect(screen.getByRole('dialog').className).toContain('w-[26rem]')
    rerender(<SheetPanel open onClose={() => {}} label="A" sheet>
        <p>isi</p>
      </SheetPanel>)
    expect(screen.getByRole('dialog').className).toContain('bottom-0')
  })
})
