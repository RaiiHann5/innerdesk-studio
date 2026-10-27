// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { makeTask } from '@/lib/testing'
import { useTaskStore } from '@/stores/entities'
import { QuickAdd } from './QuickAdd'

beforeEach(async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  localStorage.clear()
  localStorage.setItem(STORAGE_PREFIX + 'tasks', JSON.stringify([makeTask({ id: 'TSK-1', status: 'doing', order: 3000 })]))
  await useTaskStore.getState().load()
})
afterEach(cleanup)

const open = () => fireEvent.click(screen.getByRole('button', { name: /Tambah task ke kolom Dikerjakan/ }))
const field = () => screen.getByLabelText(/Judul task baru/) as HTMLInputElement

describe('QuickAdd', () => {
  it('opens a field, saves on Enter and stays open and empty for the next one', async () => {
    render(<QuickAdd status="doing" projectId="prj-1" />)
    open()
    fireEvent.change(field(), { target: { value: 'Satu' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    fireEvent.change(field(), { target: { value: 'Dua' } })
    fireEvent.keyDown(field(), { key: 'Enter' })

    await waitFor(() => expect(useTaskStore.getState().items).toHaveLength(3))
    const added = useTaskStore.getState().items.filter((t) => t.id !== 'TSK-1')
    expect(added.map((t) => t.title)).toEqual(['Satu', 'Dua'])
    expect(added.every((t) => t.status === 'doing' && t.projectId === 'prj-1')).toBe(true)
    expect(added[0].order).toBeLessThan(added[1].order)
    expect(field().value).toBe('')
  })

  it('ignores a blank title', () => {
    render(<QuickAdd status="doing" />)
    open()
    fireEvent.change(field(), { target: { value: '   ' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    expect(useTaskStore.getState().items).toHaveLength(1)
  })

  it('closes on Escape and brings the button back', () => {
    render(<QuickAdd status="doing" />)
    open()
    fireEvent.keyDown(field(), { key: 'Escape' })
    expect(screen.queryByLabelText(/Judul task baru/)).toBeNull()
    expect(screen.getByRole('button', { name: /Tambah task ke kolom Dikerjakan/ })).toBeTruthy()
  })

  it('keeps the title and offers a retry when saving fails', async () => {
    const add = vi.spyOn(useTaskStore.getState(), 'add')
    useTaskStore.setState({ add: () => Promise.reject(new Error('gagal')) })
    render(<QuickAdd status="doing" />)
    open()
    fireEvent.change(field(), { target: { value: 'Tetap ada' } })
    fireEvent.keyDown(field(), { key: 'Enter' })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/gagal dibuat/))
    expect(field().value).toBe('Tetap ada')
    add.mockRestore()
  })
})
