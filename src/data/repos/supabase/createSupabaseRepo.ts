import { supabase } from '@/lib/supabase'
import type { Entity, NewEntity } from '@/types/domain'
import type { Repo } from '../interfaces'
import { compileCodec, type Codec, type Row, type TableSpec } from './codec'
import { toDataError } from './errors'
import { fetchAll } from './query'

const from = (name: string) => supabase().from(name)
type SelectBuilder = ReturnType<ReturnType<typeof from>['select']>

/** What the specialised repos (day, habit log, goal, event, focus) build on: one table, its codec, and paged reads. */
export interface TableAccess<T extends Entity> {
  spec: TableSpec
  codec: Codec<T>
  /** Every row that passes `filter`, in a stable order, every page. */
  rows(filter?: (query: SelectBuilder) => SelectBuilder): Promise<Row[]>
  /** The row that passes `filter`, or null. */
  one(filter: (query: SelectBuilder) => SelectBuilder): Promise<Row | null>
}

export function tableAccess<T extends Entity>(spec: TableSpec): TableAccess<T> {
  const codec = compileCodec<T>(spec)
  const order = spec.order ?? ['created_at', 'id']
  return {
    spec,
    codec,
    rows: (filter = (q) => q) =>
      fetchAll<Row>((start, end) => {
        let query = filter(from(spec.table).select('*'))
        for (const column of order) query = query.order(column)
        return query.range(start, end)
      }),
    async one(filter) {
      const { data, error } = await filter(from(spec.table).select('*')).maybeSingle()
      if (error) throw toDataError(error)
      return data ? (data as Row) : null
    },
  }
}

/** The plain Repo for one table. Ids are made by the database and never reused. */
export function createSupabaseRepo<T extends Entity>(spec: TableSpec): Repo<T> {
  const { codec, rows } = tableAccess<T>(spec)

  const repo: Repo<T> = {
    async list() {
      return (await rows()).map(codec.fromRow)
    },
    async get(id) {
      const { data, error } = await from(spec.table).select('*').eq('id', id).maybeSingle()
      if (error) throw toDataError(error)
      return data ? codec.fromRow(data as Row) : null
    },
    async create(input: NewEntity<T>) {
      const { data, error } = await from(spec.table).insert(codec.toRow(input)).select().single()
      if (error) throw toDataError(error)
      return codec.fromRow(data as Row)
    },
    async update(id, patch) {
      const row = codec.toRow(patch)
      if (Object.keys(row).length === 0) {
        const current = await repo.get(id)
        if (!current) throw toDataError({ code: 'PGRST116' })
        return current
      }
      // A patch, never a replacement: fields the caller did not send (focus time, note count) are left alone.
      const { data, error } = await from(spec.table).update(row).eq('id', id).select().single()
      if (error) throw toDataError(error)
      return codec.fromRow(data as Row)
    },
    async remove(id) {
      // Removing what is not there is not an error.
      const { error } = await from(spec.table).delete().eq('id', id)
      if (error) throw toDataError(error)
    },
    async restore(item) {
      const { data, error } = await from(spec.table).insert(codec.toRestoreRow(item)).select().single()
      if (error) throw toDataError(error)
      return codec.fromRow(data as Row)
    },
  }
  return repo
}
