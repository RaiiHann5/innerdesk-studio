import { supabase } from '@/lib/supabase'
import type { Goal, GoalContribution, NewEntity } from '@/types/domain'
import type { GoalRepo } from '../interfaces'
import type { Row } from './codec'
import { createSupabaseRepo, tableAccess } from './createSupabaseRepo'
import { DataError, toDataError } from './errors'
import { fetchAll } from './query'
import { specs } from './tables'

const toContribution = (row: Row): GoalContribution => ({
  id: String(row.id),
  date: String(row.date),
  amountMinor: Number(row.amount_minor),
  ...(row.note != null ? { note: String(row.note) } : {}),
})

/**
 * A goal and its contributions are two tables, but the UI treats the contributions as an array on the goal and always
 * writes it whole. The array is replaced in one transaction by the goal_replace_contributions function, so a failed
 * save leaves the previous list. Child ids are made by the client and kept.
 */
export function createSupabaseGoalRepo(): GoalRepo {
  const base = createSupabaseRepo<Goal>(specs.goals)
  const { codec } = tableAccess<Goal>(specs.goals)
  const contributions = () => supabase().from('goal_contributions')

  const readContributions = async (goalId?: string): Promise<Map<string, GoalContribution[]>> => {
    const byGoal = new Map<string, GoalContribution[]>()
    const rows = await fetchAll<Row>((from, to) => {
      let query = contributions().select('*')
      if (goalId) query = query.eq('goal_id', goalId)
      return query.order('goal_id').order('position').order('id').range(from, to)
    })
    for (const row of rows) {
      const list = byGoal.get(String(row.goal_id)) ?? []
      list.push(toContribution(row))
      byGoal.set(String(row.goal_id), list)
    }
    return byGoal
  }

  const replace = async (goalId: string, items: GoalContribution[]): Promise<void> => {
    if (items.some((c) => !Number.isSafeInteger(c.amountMinor))) throw new DataError('invalid', 'Data tidak valid.')
    const { error } = await supabase().rpc('goal_replace_contributions', { p_goal_id: goalId, p_items: items })
    if (error) throw toDataError(error)
  }

  const split = <T extends { contributions?: GoalContribution[] }>(input: T) => {
    const { contributions: items, ...rest } = input
    return { items, rest }
  }

  return {
    async list() {
      const [goals, byGoal] = await Promise.all([base.list(), readContributions()])
      return goals.map((goal) => ({ ...goal, contributions: byGoal.get(goal.id) ?? [] }))
    },
    async get(id) {
      const goal = await base.get(id)
      return goal ? { ...goal, contributions: (await readContributions(id)).get(id) ?? [] } : null
    },
    async create(input: NewEntity<Goal>) {
      const { items, rest } = split(input)
      const goal = await base.create(rest as NewEntity<Goal>)
      if (items?.length) {
        try {
          await replace(goal.id, items)
        } catch (error) {
          // No half-made goal: it is removed again, and the failure is reported.
          await base.remove(goal.id).catch(() => undefined)
          throw error
        }
      }
      return { ...goal, contributions: items ?? [] }
    },
    async update(id, patch) {
      const { items, rest } = split(patch)
      const hasFields = Object.keys(codec.toRow(rest)).length > 0
      const current = hasFields ? await base.update(id, rest as Partial<NewEntity<Goal>>) : await base.get(id)
      if (!current) throw toDataError({ code: 'PGRST116' })
      if (items !== undefined) await replace(id, items)
      return { ...current, contributions: items ?? (await readContributions(id)).get(id) ?? [] }
    },
    remove: (id) => base.remove(id),
    async restore(goal) {
      const { items, rest } = split(goal)
      const restored = await base.restore(rest as Goal)
      if (items?.length) {
        try {
          await replace(restored.id, items)
        } catch (error) {
          await base.remove(restored.id).catch(() => undefined)
          throw error
        }
      }
      return { ...restored, contributions: items ?? [] }
    },
  }
}
