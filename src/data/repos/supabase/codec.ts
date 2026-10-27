import type { Entity } from '@/types/domain'

export type Row = Record<string, unknown>
/** A domain key whose column is its snake_case form, or `[key, column]` when the name differs ("order" is a reserved word). */
export type FieldSpec = string | readonly [key: string, column: string]

export interface TableSpec {
  table: string
  fields: readonly FieldSpec[]
  /** Fields stored as timestamptz. They are read back as canonical ISO ("...Z", milliseconds), the form the app writes and compares as strings. */
  timestamps?: readonly string[]
  /** Columns `list()` sorts by, so paging is stable. Defaults to created_at, id. */
  order?: readonly string[]
  /** Domain keys that do not map to one column. `read` and `write` translate them. */
  custom?: {
    keys: readonly string[]
    read(row: Row, out: Record<string, unknown>): void
    write(input: Record<string, unknown>, row: Row): void
  }
}

export interface Codec<T extends Entity> {
  spec: TableSpec
  fromRow(row: Row): T
  /**
   * The columns for an insert or a patch. Only keys present in `input` are written, and a present key whose value is
   * `undefined` becomes null: that is how the UI clears an optional field (JSON would silently drop it).
   * `id`, `createdAt` and `updatedAt` are never taken from the input, the database owns them. An unknown key throws,
   * so a field added to the domain but not to the table fails loudly instead of being lost.
   */
  toRow(input: object): Row
  /** A complete row for put-back (undo, import): the id and both timestamps are kept as they were. */
  toRestoreRow(item: T): Row
}

const OWNED = new Set(['id', 'createdAt', 'updatedAt'])
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

export function toIso(value: unknown): string {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString()
}

export function compileCodec<T extends Entity>(spec: TableSpec): Codec<T> {
  const columns = new Map<string, string>(spec.fields.map((f) => (typeof f === 'string' ? [f, snake(f)] : [f[0], f[1]])))
  const timestamps = new Set(spec.timestamps ?? [])
  const customKeys = new Set(spec.custom?.keys ?? [])

  const toRow = (input: object): Row => {
    const row: Row = {}
    const record = input as Record<string, unknown>
    for (const key of Object.keys(record)) {
      if (OWNED.has(key)) continue
      const column = columns.get(key)
      if (column) row[column] = record[key] === undefined ? null : record[key]
      else if (!customKeys.has(key)) throw new Error(`Field "${key}" belum dipetakan ke tabel ${spec.table}.`)
    }
    spec.custom?.write(record, row)
    return row
  }

  return {
    spec,
    toRow,
    toRestoreRow(item) {
      return { ...toRow(item), id: item.id, created_at: item.createdAt, updated_at: item.updatedAt }
    },
    fromRow(row) {
      const out: Record<string, unknown> = { id: row.id, createdAt: toIso(row.created_at), updatedAt: toIso(row.updated_at) }
      for (const [key, column] of columns) {
        const value = row[column]
        if (value === null || value === undefined) continue
        out[key] = timestamps.has(key) ? toIso(value) : value
      }
      spec.custom?.read(row, out)
      return out as unknown as T
    },
  }
}
