import { useEventStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { NewEntity } from '@/types/domain'
import { allDayShift, dayDelta, placementPatch } from '../lib/dragGeometry'
import type { Occurrence } from '../lib/recurrence'
import { isSingleOccurrence } from './store'

/** Which part of a series a drop applies to. */
export type MoveScope = 'single' | 'series'

/** The instants or day shift a drop writes. */
export interface Reschedule {
  start?: string
  end?: string
}

/** Fields for a placement. A timed event takes new instants; an all-day event moves by whole days. */
export function rescheduleOf(occurrence: Occurrence, placement: { day: Date; startMin: number; endMin: number }): Reschedule {
  return occurrence.event.allDay
    ? allDayShift(occurrence, dayDelta(occurrence.start, placement.day))
    : placementPatch(occurrence, placement.day, placement.startMin, placement.endMin)
}

const withPlacement = (occurrence: Occurrence, placement: Reschedule): NewEntity<typeof occurrence.event> => {
  const { event } = occurrence
  return {
    title: event.title,
    start: placement.start ?? event.start,
    end: placement.end ?? event.end,
    allDay: event.allDay,
    categoryId: event.categoryId,
    projectId: event.projectId,
    location: event.location,
    link: event.link,
    description: event.description,
    reminders: [...event.reminders],
    recurrence: event.recurrence ? { ...event.recurrence, exceptions: [...event.recurrence.exceptions] } : undefined,
  }
}

/**
 * Persists a drag.
 *
 * A drop on one repeat of a series either detaches that repeat, or moves the master so the whole
 * series shifts by the same amount. `createEntityStore` applies the change optimistically and puts
 * the previous items back if the repo rejects it, so a failure surfaces as a toast with a retry
 * rather than a lost or half-moved event.
 */
export async function applyReschedule(
  occurrence: Occurrence,
  placement: Reschedule,
  scope: MoveScope,
): Promise<boolean> {
  const { event } = occurrence
  const store = useEventStore.getState()
  const detached = isSingleOccurrence({ token: 0, event, occurrenceStart: occurrence.start.toISOString() })

  const run = async () => {
    if (scope === 'single' && detached) {
      const rule = event.recurrence
      if (!rule) throw new Error('Event ini bukan bagian dari rangkaian berulang.')
      const exceptions = [...rule.exceptions, occurrence.start.toISOString().slice(0, 10)]
      // The series gives up this day first, so a failure leaves the day simply empty
      // instead of showing the event twice.
      await store.update(event.id, { recurrence: { ...rule, exceptions } })
      await store.add({ ...withPlacement(occurrence, placement), recurringEventId: event.id, originalStart: occurrence.start.toISOString() })
      useUiStore.getState().showToast('Event ini saja dipindahkan')
      return
    }
    await store.update(event.id, placement)
    useUiStore.getState().showToast('Event dipindahkan')
  }

  try {
    await run()
    return true
  } catch {
    useUiStore.getState().showToast('Event gagal dipindahkan.', { label: 'Coba lagi', run: () => void applyReschedule(occurrence, placement, scope) })
    return false
  }
}