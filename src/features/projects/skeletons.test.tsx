// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ProjectDetailSkeleton, ProjectsSkeleton } from './skeletons'

afterEach(cleanup)

describe('skeletons', () => {
  it.each([
    ['ProjectsSkeleton', ProjectsSkeleton],
    ['ProjectDetailSkeleton', ProjectDetailSkeleton],
  ])('%s is one polite "Memuat" status and hides its grey blocks from assistive technology', (_name, Skeleton) => {
    const { container } = render(<Skeleton />)
    expect(screen.getAllByRole('status', { name: 'Memuat' })).toHaveLength(1)
    const blocks = container.querySelectorAll('.animate-pulse')
    expect(blocks.length).toBeGreaterThan(3)
    expect([...blocks].every((b) => b.getAttribute('aria-hidden') === 'true')).toBe(true)
  })
})
