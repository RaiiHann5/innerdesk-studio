// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeTask } from '@/lib/testing'
import { TaskCard } from './TaskCard'

afterEach(cleanup)
const text = (container: HTMLElement) => container.textContent ?? ''

describe('TaskCard extras', () => {
  it('shows nothing extra on a plain task', () => {
    const { container } = render(<TaskCard task={makeTask()} />)
    expect(text(container)).not.toMatch(/Subtask|Estimasi|Setiap/)
  })

  it('shows subtask progress only when there are subtasks', () => {
    const subtasks = [
      { id: 'a', title: 'A', done: true },
      { id: 'b', title: 'B', done: true },
      { id: 'c', title: 'C', done: false },
      { id: 'd', title: 'D', done: false },
      { id: 'e', title: 'E', done: false },
    ]
    const { container } = render(<TaskCard task={makeTask({ subtasks })} />)
    expect(text(container)).toContain('2/5')
  })

  it('shows the estimate and the recurrence only when set', () => {
    const { container } = render(<TaskCard task={makeTask({ estimateMinutes: 90, recurrence: { freq: 'weekly', interval: 2 } })} />)
    expect(text(container)).toContain('1 j 30 m')
    expect(text(container)).toContain('Setiap 2 minggu')
  })

  it('keeps the overdue due date as red text, with no extra badge', () => {
    const { container } = render(<TaskCard task={makeTask({ dueDate: '2020-01-01' })} />)
    const due = container.querySelector('.text-status-overdue')
    expect(due?.textContent).toContain('Terlambat')
    expect(container.querySelectorAll('.text-status-overdue')).toHaveLength(1)
  })
})
