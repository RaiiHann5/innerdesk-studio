import { describe, expect, it } from 'vitest'
import type { Task, Transaction } from '@/types/domain'
import { compileCodec } from './codec'
import { specs } from './tables'
import { toDataError } from './errors'
import { assertPublicConfig } from '@/lib/supabase'

const tasks = compileCodec<Task>(specs.tasks)
const txs = compileCodec<Transaction>(specs.transactions)

describe('codec', () => {
  it('maps camelCase to snake_case and renames "order"', () => {
    expect(tasks.toRow({ title: 'A', dueDate: '2026-10-01', order: 2500.5, focusCount: 1 })).toEqual({
      title: 'A',
      due_date: '2026-10-01',
      sort_order: 2500.5,
      focus_count: 1,
    })
  })

  it('turns undefined into null so a cleared field reaches the database, and leaves absent fields out', () => {
    const row = tasks.toRow({ archivedAt: undefined, dueDate: undefined })
    expect(row).toEqual({ archived_at: null, due_date: null })
    expect('time_log' in row).toBe(false)
  })

  it('never takes id or timestamps from the input, and rejects a field it does not know', () => {
    expect(tasks.toRow({ id: 'x', createdAt: 'y', updatedAt: 'z', title: 'A' })).toEqual({ title: 'A' })
    expect(() => tasks.toRow({ nope: 1 })).toThrow(/nope/)
  })

  it('reads canonical ISO timestamps and drops nulls', () => {
    const task = tasks.fromRow({ id: 't', created_at: '2026-10-14T17:28:00.123456+00:00', updated_at: '2026-10-14T17:28:00+00:00', title: 'A', due_date: null, completed_at: '2026-10-15T01:00:00+07:00', sort_order: 3 })
    expect(task.createdAt).toBe('2026-10-14T17:28:00.123Z')
    expect(task.completedAt).toBe('2026-10-14T18:00:00.000Z')
    expect('dueDate' in task).toBe(false)
    expect(task.order).toBe(3)
  })

  it('restore rows keep id and timestamps', () => {
    const row = tasks.toRestoreRow({ id: 'TSK-4', createdAt: 'c', updatedAt: 'u', title: 'A' } as Task)
    expect(row).toMatchObject({ id: 'TSK-4', created_at: 'c', updated_at: 'u', title: 'A' })
  })

  it('splits and joins the fx pair on transactions', () => {
    expect(txs.toRow({ fx: { rate: 15500, baseAmountMinor: 1550000 } })).toEqual({ fx_rate: 15500, fx_base_amount_minor: 1550000 })
    expect(txs.toRow({ fx: undefined })).toEqual({ fx_rate: null, fx_base_amount_minor: null })
    expect(txs.fromRow({ id: 'x', created_at: 'a', updated_at: 'a', fx_rate: '15500.000000', fx_base_amount_minor: 1550000 }).fx).toEqual({ rate: 15500, baseAmountMinor: 1550000 })
    expect(txs.fromRow({ id: 'x', created_at: 'a', updated_at: 'a' }).fx).toBeUndefined()
  })
})

describe('error mapping', () => {
  it('maps database codes to safe messages that carry no SQL', () => {
    expect(toDataError({ code: '23505', message: 'duplicate key value violates unique constraint "x"' })).toMatchObject({ code: 'conflict', message: 'Data sudah ada.' })
    expect(toDataError({ code: 'VLT01' }).code).toBe('conflict')
    expect(toDataError({ code: '23503' }).code).toBe('in-use')
    expect(toDataError({ code: '23514' }).code).toBe('invalid')
    expect(toDataError({ code: '22P02' }).code).toBe('invalid')
    expect(toDataError({ code: 'PGRST116' }).code).toBe('not-found')
    expect(toDataError({ code: '42501' }).code).toBe('auth')
    expect(toDataError({ code: '', message: 'TypeError: Failed to fetch' }).code).toBe('network')
    expect(toDataError({ code: '12345', message: 'relation "tasks" does not exist' }).message).not.toMatch(/tasks/)
  })
})

describe('public key guard', () => {
  const jwt = (role: string) => `h.${btoa(JSON.stringify({ role })).replace(/=+$/, '')}.s`
  it('refuses a service_role or secret key', () => {
    expect(() => assertPublicConfig('https://a.supabase.co', jwt('service_role'))).toThrow(/service_role/)
    expect(() => assertPublicConfig('https://a.supabase.co', 'sb_secret_abc')).toThrow()
  })
  it('accepts anon and publishable keys, and requires https except on localhost', () => {
    expect(() => assertPublicConfig('https://a.supabase.co', jwt('anon'))).not.toThrow()
    expect(() => assertPublicConfig('https://a.supabase.co', 'sb_publishable_abc')).not.toThrow()
    expect(() => assertPublicConfig('http://a.supabase.co', jwt('anon'))).toThrow(/https/)
    expect(() => assertPublicConfig('http://127.0.0.1:54321', jwt('anon'))).not.toThrow()
  })
})
