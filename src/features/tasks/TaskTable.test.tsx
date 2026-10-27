// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { groupTasks } from '@/lib/taskQuery'
import { makeTask } from '@/lib/testing'
import type { Task } from '@/types/domain'
import { TaskTable } from './TaskTable'

afterEach(cleanup)

const tasks = [
  makeTask({ id: 'TSK-1', title: 'Satu', status: 'todo' }),
  makeTask({ id: 'TSK-2', title: 'Dua', status: 'todo' }),
  makeTask({ id: 'TSK-3', title: 'Tiga', status: 'doing', subtasks: [{ id: 'a', title: 'x', done: true }, { id: 'b', title: 'y', done: false }] }),
  makeTask({ id: 'TSK-4', title: 'Empat', status: 'done' }),
]

function Harness({ grouped = false, onOpen = () => {} }: { grouped?: boolean; onOpen?: (t: Task) => void }) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  return (
    <>
      <p data-testid="picked">{[...selected].sort().join(',')}</p>
      <TaskTable
        tasks={tasks}
        groups={grouped ? groupTasks(tasks, 'status') : null}
        collapsed={collapsed}
        onToggleGroup={(k) => setCollapsed((c) => (c.has(k) ? new Set([...c].filter((x) => x !== k)) : new Set([...c, k])))}
        selected={selected}
        onSelect={setSelected}
        projectById={new Map()}
        showProject={false}
        onOpen={onOpen}
      />
    </>
  )
}
const picked = () => screen.getByTestId('picked').textContent
const box = (title: string) => screen.getByLabelText(`Pilih ${title}`) as HTMLInputElement

describe('TaskTable selection', () => {
  it('selects and deselects single rows', () => {
    render(<Harness />)
    fireEvent.click(box('Dua'))
    expect(picked()).toBe('TSK-2')
    fireEvent.click(box('Dua'))
    expect(picked()).toBe('')
  })

  it('shift-click selects the range from the last click', () => {
    render(<Harness />)
    fireEvent.click(box('Satu'))
    fireEvent.click(box('Empat'), { shiftKey: true })
    expect(picked()).toBe('TSK-1,TSK-2,TSK-3,TSK-4')
  })

  it('header checkbox selects all, shows a mixed state, and clears', () => {
    render(<Harness />)
    const all = screen.getByLabelText('Pilih semua task yang tampil') as HTMLInputElement
    fireEvent.click(box('Satu'))
    expect(all.indeterminate).toBe(true)
    fireEvent.click(all)
    expect(picked()).toBe('TSK-1,TSK-2,TSK-3,TSK-4')
    expect(all.checked).toBe(true)
    fireEvent.click(all)
    expect(picked()).toBe('')
  })

  it('arrow keys move between row checkboxes and Escape clears the selection', () => {
    render(<Harness />)
    box('Satu').focus()
    fireEvent.keyDown(box('Satu'), { key: 'ArrowDown' })
    expect(document.activeElement).toBe(box('Dua'))
    fireEvent.keyDown(box('Dua'), { key: 'ArrowUp' })
    expect(document.activeElement).toBe(box('Satu'))
    fireEvent.click(box('Satu'))
    fireEvent.keyDown(box('Satu'), { key: 'Escape' })
    expect(picked()).toBe('')
  })

  it('opens a task from its title and shows subtask progress only where it exists', () => {
    const onOpen = vi.fn()
    render(<Harness onOpen={onOpen} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tiga' }))
    expect(onOpen).toHaveBeenCalledWith(tasks[2])
    expect(screen.getAllByText('1/2')).toHaveLength(1)
  })
})

describe('TaskTable groups', () => {
  it('lists groups with counts and collapses one, leaving selection ranges to the visible rows', () => {
    render(<Harness grouped />)
    const todo = screen.getByRole('button', { name: /Belum mulai/ })
    expect(todo.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(todo)
    expect(todo.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByLabelText('Pilih Satu')).toBeNull()

    fireEvent.click(box('Tiga'))
    fireEvent.click(box('Empat'), { shiftKey: true })
    expect(picked()).toBe('TSK-3,TSK-4')
  })
})
