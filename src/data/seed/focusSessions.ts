import { addDays, startOfDay } from 'date-fns'
import type { FocusMode, FocusSession, SeedEntity } from '@/types/domain'
import { PROJECT_IDS as P } from './projects'
import { TASK_IDS as T } from './tasks'

const MINUTE = 60_000

/** Focus blocks for the past two weeks, so the week chart and the session list have something real in them. */
const PLAN: Array<{ daysAgo: number; hour: number; mode: FocusMode; minutes: number; completed: boolean; taskId?: string }> = [
  { daysAgo: 13, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.situsAlur },
  { daysAgo: 13, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 13, hour: 11, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 13, hour: 12, mode: 'focus', minutes: 25, completed: false, taskId: T.situsAlur },
  { daysAgo: 13, hour: 14, mode: 'short', minutes: 5, completed: true },
  { daysAgo: 12, hour: 8, mode: 'focus', minutes: 25, completed: true, taskId: T.portofolioKerangka },
  { daysAgo: 12, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.portofolioKerangka },
  { daysAgo: 12, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.inggrisRiset },
  { daysAgo: 12, hour: 11, mode: 'focus', minutes: 25, completed: true, taskId: T.inggrisRiset },
  { daysAgo: 12, hour: 13, mode: 'long', minutes: 15, completed: true },
  { daysAgo: 11, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.batikGateway },
  { daysAgo: 11, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.batikGateway },
  { daysAgo: 11, hour: 11, mode: 'focus', minutes: 25, completed: false },
  { daysAgo: 10, hour: 20, mode: 'focus', minutes: 25, completed: true, taskId: T.laravelQueue },
  { daysAgo: 9, hour: 8, mode: 'focus', minutes: 25, completed: true, taskId: T.situsSurat },
  { daysAgo: 9, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.situsSurat },
  { daysAgo: 9, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.batikCheckout },
  { daysAgo: 8, hour: 14, mode: 'focus', minutes: 25, completed: true, taskId: T.portofolioKerangka },
  { daysAgo: 8, hour: 15, mode: 'focus', minutes: 25, completed: true, taskId: T.portofolioKerangka },
  { daysAgo: 7, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.inggrisRiset },
  { daysAgo: 7, hour: 10, mode: 'focus', minutes: 25, completed: false },
  { daysAgo: 6, hour: 19, mode: 'focus', minutes: 25, completed: true, taskId: T.situsAlur },
  { daysAgo: 5, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.batikGateway },
  { daysAgo: 5, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.batikGateway },
  { daysAgo: 5, hour: 11, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 5, hour: 12, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 5, hour: 14, mode: 'long', minutes: 15, completed: true },
  { daysAgo: 4, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.portofolioKerangka },
  { daysAgo: 4, hour: 11, mode: 'focus', minutes: 25, completed: false },
  { daysAgo: 3, hour: 8, mode: 'focus', minutes: 25, completed: true, taskId: T.laravelQueue },
  { daysAgo: 3, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.situsSurat },
  { daysAgo: 2, hour: 20, mode: 'focus', minutes: 25, completed: true, taskId: T.inggrisRiset },
  { daysAgo: 1, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.batikCheckout },
  { daysAgo: 1, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.batikCheckout },
  { daysAgo: 1, hour: 11, mode: 'focus', minutes: 25, completed: true, taskId: T.situsAlur },
  { daysAgo: 0, hour: 9, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 0, hour: 10, mode: 'focus', minutes: 25, completed: true, taskId: T.situsForm },
  { daysAgo: 0, hour: 11, mode: 'short', minutes: 5, completed: true },
  { daysAgo: 0, hour: 14, mode: 'focus', minutes: 25, completed: true, taskId: T.batikGateway },
  { daysAgo: 0, hour: 15, mode: 'focus', minutes: 25, completed: false, taskId: T.batikGateway },
]

const PROJECT_OF: Record<string, string> = {
  [T.situsAlur]: P.situs,
  [T.situsForm]: P.situs,
  [T.situsSurat]: P.situs,
  [T.portofolioKerangka]: P.portofolio,
  [T.inggrisRiset]: P.inggris,
  [T.batikGateway]: P.batik,
  [T.batikCheckout]: P.batik,
  [T.laravelQueue]: P.laravel,
}

const PLANNED_SECONDS: Record<FocusMode, number> = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 }

export const seedFocusSessions = (): SeedEntity<FocusSession>[] =>
  PLAN.map((entry, i) => {
    const started = new Date(startOfDay(addDays(new Date(), -entry.daysAgo)).getTime() + entry.hour * 60 * MINUTE)
    // A partial session stopped early: a few minutes short of the full block.
    const actualSeconds = entry.completed ? PLANNED_SECONDS[entry.mode] : Math.max(60, (entry.minutes - 4) * 60)
    return {
      id: `FCS-${i + 1}`,
      mode: entry.mode,
      taskId: entry.taskId,
      projectId: entry.taskId ? PROJECT_OF[entry.taskId] : undefined,
      plannedSeconds: PLANNED_SECONDS[entry.mode],
      actualSeconds,
      startedAt: started.toISOString(),
      endedAt: new Date(started.getTime() + actualSeconds * 1000).toISOString(),
      completed: entry.completed,
    }
  })