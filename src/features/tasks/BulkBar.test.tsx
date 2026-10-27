// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeProject, makeTask } from '@/lib/testing'
import { BulkBar } from './BulkBar'

afterEach(cleanup)

const setup = (count = 2) => {
  const handlers = { onApply: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn(), onClear: vi.fn() }
  render(<BulkBar count={count} projects={[makeProject({ id: 'prj-1', name: 'Situs' })]} {...handlers} />)
  return handlers
}

describe('BulkBar', () => {
  it('shows nothing but an empty live region while no row is selected', () => {
    setup(0)
    expect(screen.queryByRole('toolbar')).toBeNull()
    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('announces the count and shows it', () => {
    setup(3)
    expect(screen.getByRole('status').textContent).toBe('3 task dipilih.')
    expect(screen.getByRole('toolbar').textContent).toContain('3 dipilih')
  })

  it('applies a status, a priority and a project to the selection', () => {
    const { onApply } = setup()
    fireEvent.change(screen.getByLabelText('Ubah status'), { target: { value: 'done' } })
    expect(onApply.mock.calls[0][0](makeTask())).toEqual({ status: 'done' })
    fireEvent.change(screen.getByLabelText('Ubah prioritas'), { target: { value: 'urgent' } })
    expect(onApply.mock.calls[1][0](makeTask())).toEqual({ priority: 'urgent' })
    fireEvent.change(screen.getByLabelText('Pindahkan ke project'), { target: { value: 'prj-1' } })
    expect(onApply.mock.calls[2][0](makeTask())).toEqual({ projectId: 'prj-1' })
    fireEvent.change(screen.getByLabelText('Pindahkan ke project'), { target: { value: '__none' } })
    expect(onApply.mock.calls[3][0](makeTask())).toEqual({ projectId: undefined })
  })

  it('adds tags without dropping the ones a task already has', () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Tag' }))
    fireEvent.change(screen.getByPlaceholderText('frontend, revisi'), { target: { value: 'baru, lama' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tambahkan' }))
    expect(onApply.mock.calls[0][0](makeTask({ tags: ['lama', 'x'] }))).toEqual({ tags: ['lama', 'x', 'baru'] })
  })

  it('sets and clears the due date', () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Tenggat' }))
    fireEvent.change(screen.getByLabelText('Tenggat baru'), { target: { value: '2026-11-02' } })
    fireEvent.click(screen.getByRole('button', { name: 'Terapkan' }))
    expect(onApply.mock.calls[0][0](makeTask())).toEqual({ dueDate: '2026-11-02' })

    fireEvent.click(screen.getByRole('button', { name: 'Tenggat' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus tenggat' }))
    expect(onApply.mock.calls[1][0](makeTask())).toEqual({ dueDate: undefined, dueTime: undefined })
  })

  it('archives, deletes and clears', () => {
    const { onArchive, onDelete, onClear } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Arsipkan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hapus' }))
    fireEvent.click(screen.getByRole('button', { name: 'Batal pilih' }))
    expect([onArchive, onDelete, onClear].every((fn) => fn.mock.calls.length === 1)).toBe(true)
  })
})
