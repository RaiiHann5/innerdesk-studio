import { supabase } from '@/lib/supabase'
import type { Entity, HabitLog, NewEntity } from '@/types/domain'
import type { DayRepo, HabitLogRepo } from '../interfaces'
import type { Row, TableSpec } from './codec'
import { createSupabaseRepo, tableAccess } from './createSupabaseRepo'
import { toDataError } from './errors'

/**
 * One record per calendar day. `upsert` is a single INSERT ... ON CONFLICT (user_id, date) DO UPDATE, so two saves for
 * the same day (journal autosave fires several times a second) can never make two rows. `create` is `upsert`, so the
 * one-per-day rule cannot be bypassed through the generic store. Fields left out of the input keep their stored value.
 */
export function createSupabaseDayRepo<T extends Entity & { date: string }>(spec: TableSpec): DayRepo<T> {
  const base = createSupabaseRepo<T>(spec)
  const { codec, rows, one } = tableAccess<T>(spec)

  const upsert = async (input: NewEntity<T>): Promise<T> => {
    const { data, error } = await supabase().from(spec.table).upsert(codec.toRow(input), { onConflict: 'user_id,date' }).select().single()
    if (error) throw toDataError(error)
    return codec.fromRow(data as Row)
  }

  return {
    ...base,
    create: upsert,
    upsert,
    async getByDate(date) {
      const row = await one((q) => q.eq('date', date))
      return row ? codec.fromRow(row) : null
    },
    async listRange(from, to) {
      return (await rows((q) => q.gte('date', from).lte('date', to))).map(codec.fromRow)
    },
  }
}

/** One log per (habit, day). Same idea as the day repo, keyed on the pair. */
export function createSupabaseHabitLogRepo(spec: TableSpec): HabitLogRepo {
  const base = createSupabaseRepo<HabitLog>(spec)
  const { codec, rows } = tableAccess<HabitLog>(spec)

  const upsert = async (input: NewEntity<HabitLog>): Promise<HabitLog> => {
    const { data, error } = await supabase()
      .from(spec.table)
      .upsert(codec.toRow(input), { onConflict: 'user_id,habit_id,date' })
      .select()
      .single()
    if (error) throw toDataError(error)
    return codec.fromRow(data as Row)
  }

  return {
    ...base,
    create: upsert,
    upsert,
    async listRange(from, to) {
      return (await rows((q) => q.gte('date', from).lte('date', to))).map(codec.fromRow)
    },
    async removeForHabit(habitId) {
      // The deleted rows come back in the same statement, which is what undo needs to put them back.
      const { data, error } = await supabase().from(spec.table).delete().eq('habit_id', habitId).select()
      if (error) throw toDataError(error)
      return ((data ?? []) as Row[]).map(codec.fromRow)
    },
  }
}
