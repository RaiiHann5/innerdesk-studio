import { describe, expect, it } from 'vitest'
import { makeProject } from '@/lib/testing'
import { filterProjects, sortProjectRows, type ProjectRow } from './projectList'
import type { ProjectHealthLevel } from './projectStats'

const row = (name: string, o: { deadline?: string; percent?: number; level?: ProjectHealthLevel; phase?: 'riset' | 'desain' | 'pengembangan' | 'peluncuran' } = {}): ProjectRow => ({
  project: makeProject({ id: name, name, deadline: o.deadline, phase: o.phase ?? 'riset' }),
  summary: {
    progress: { done: 0, total: 0, percent: o.percent ?? 0 },
    health: { level: o.level ?? 'sehat', reason: '' },
    time: { weekMinutes: 0, totalMinutes: 0 },
    nextMilestone: null,
    tasks: { total: 0, done: 0, open: 0, overdue: 0, archivedDone: 0, percent: 0 },
  },
})
const names = (rows: ProjectRow[]) => rows.map((r) => r.project.name)

describe('filterProjects', () => {
  const list = [
    makeProject({ id: '1', name: 'Situs desa', status: 'active', description: 'Layanan surat' }),
    makeProject({ id: '2', name: 'Toko batik', status: 'paused' }),
    makeProject({ id: '3', name: 'Portofolio', status: 'done' }),
  ]
  it('filters by status', () => {
    expect(filterProjects(list, { query: '', status: 'paused' }).map((p) => p.id)).toEqual(['2'])
    expect(filterProjects(list, { query: '', status: 'all' })).toHaveLength(3)
  })
  it('searches name and description, ignoring case and outer spaces', () => {
    expect(filterProjects(list, { query: '  SURAT ', status: 'all' }).map((p) => p.id)).toEqual(['1'])
    expect(filterProjects(list, { query: 'batik', status: 'all' }).map((p) => p.id)).toEqual(['2'])
    expect(filterProjects(list, { query: 'zzz', status: 'all' })).toEqual([])
  })
})

describe('sortProjectRows', () => {
  it('sorts by name in both directions', () => {
    const rows = [row('Cakra'), row('Alfa'), row('Beta')]
    expect(names(sortProjectRows(rows, 'name', 'asc'))).toEqual(['Alfa', 'Beta', 'Cakra'])
    expect(names(sortProjectRows(rows, 'name', 'desc'))).toEqual(['Cakra', 'Beta', 'Alfa'])
  })

  it('sorts by progress', () => {
    const rows = [row('A', { percent: 50 }), row('B', { percent: 10 }), row('C', { percent: 90 })]
    expect(names(sortProjectRows(rows, 'progress', 'asc'))).toEqual(['B', 'A', 'C'])
    expect(names(sortProjectRows(rows, 'progress', 'desc'))).toEqual(['C', 'A', 'B'])
  })

  it('sorts by health, healthiest first when ascending', () => {
    const rows = [row('A', { level: 'berisiko' }), row('B', { level: 'sehat' }), row('C', { level: 'perhatian' })]
    expect(names(sortProjectRows(rows, 'health', 'asc'))).toEqual(['B', 'C', 'A'])
    expect(names(sortProjectRows(rows, 'health', 'desc'))).toEqual(['A', 'C', 'B'])
  })

  it('sorts by phase in project order', () => {
    const rows = [row('A', { phase: 'peluncuran' }), row('B', { phase: 'riset' }), row('C', { phase: 'desain' })]
    expect(names(sortProjectRows(rows, 'phase', 'asc'))).toEqual(['B', 'C', 'A'])
  })

  it('puts a project without a deadline last, in either direction', () => {
    const rows = [row('A'), row('B', { deadline: '2026-12-01' }), row('C', { deadline: '2026-11-01' })]
    expect(names(sortProjectRows(rows, 'deadline', 'asc'))).toEqual(['C', 'B', 'A'])
    expect(names(sortProjectRows(rows, 'deadline', 'desc'))).toEqual(['B', 'C', 'A'])
  })

  it('breaks ties by name and does not mutate the input', () => {
    const rows = [row('Zeta', { percent: 5 }), row('Alfa', { percent: 5 })]
    expect(names(sortProjectRows(rows, 'progress', 'asc'))).toEqual(['Alfa', 'Zeta'])
    expect(names(rows)).toEqual(['Zeta', 'Alfa'])
  })
})
