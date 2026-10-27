import { addMinutes, parseISO, setHours, setMinutes, startOfDay } from 'date-fns'
import { fmt, toISODate } from '@/lib/date'
import { useCategoryStore, useEventStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { NewEntity } from '@/types/domain'
import { blankDraft, DEFAULT_MINUTES, toEventInput, type EventDraft } from './eventDraft'
import { useEditorStore, type EditorTarget } from './store'
import type { Occurrence } from '../lib/recurrence'

/** Which part of a series a change applies to. */
export type EditScope = 'single' | 'series'

/** The first category that exists, so a new event is never left without one. */
const fallbackCategoryId = (): string => useCategoryStore.getState().items[0]?.id ?? ''

/** Open the editor for a new event, prefilled from a day, a slot on the grid or a quick capture. */
export function openNewEvent(day: Date, prefill: Partial<EventDraft> = {}): void {
  const draft: EventDraft = { ...blankDraft(day, fallbackCategoryId()), ...prefill }
  if (!draft.categoryId) draft.categoryId = fallbackCategoryId()
  useEditorStore.getState().open({ prefill: draft })
}

/** Open the editor for a chip or block. A repeat is opened on the occurrence that was clicked. */
export function openOccurrence(occurrence: Occurrence): void {
  useEditorStore.getState().open({
    event: occurrence.event,
    occurrenceStart: occurrence.isRecurring ? occurrence.start.toISOString() : undefined,
  })
}

/** Quick create from a month cell: a title and an optional start time, one hour long. */
export function quickDraft(day: Date, title: string, time?: string): EventDraft {
  const draft = blankDraft(day, fallbackCategoryId())
  const [hour, minute] = (time || '').split(':').map(Number)
  const start = Number.isFinite(hour) ? setMinutes(setHours(startOfDay(day), hour), minute || 0) : null
  if (!start) return { ...draft, title: title.trim() }
  return {
    ...draft,
    title: title.trim(),
    startTime: fmt(start, 'HH:mm'),
    endTime: fmt(addMinutes(start, DEFAULT_MINUTES), 'HH:mm'),
  }
}

const withToastRetry = (message: string, retry: () => void) =>
  useUiStore.getState().showToast(message, { label: 'Coba lagi', run: retry })

/**
 * Detaches one repeat from its series: the series skips that day and a standalone copy
 * carries the change. The series is written first, so a failure leaves the day simply missing
 * rather than showing the event twice.
 */
async function detachOccurrence(target: EditorTarget, draft: EventDraft, occurrenceStart: string): Promise<void> {
  const event = target.event!
  const { add, update } = useEventStore.getState()
  const rule = event.recurrence
  if (!rule) throw new Error('Event ini bukan bagian dari rangkaian berulang.')
  const exceptions = [...rule.exceptions, toISODate(parseISO(occurrenceStart))]

  await update(event.id, { recurrence: { ...rule, exceptions } })
  const fields: NewEntity<typeof event> = {
    ...toEventInput(draft, event),
    recurringEventId: event.id,
    originalStart: occurrenceStart,
  }
  await add(fields)
}

/** Create, edit or detach an event. Returns false when the repo rejected the write, so the editor stays open. */
export async function saveDraft(target: EditorTarget, draft: EventDraft, scope: EditScope): Promise<boolean> {
  const { add, update } = useEventStore.getState()

  const run = async () => {
    if (!target.event) {
      await add(toEventInput(draft))
      useUiStore.getState().showToast('Event dibuat')
    } else if (target.occurrenceStart && scope === 'single') {
      await detachOccurrence(target, draft, target.occurrenceStart)
      useUiStore.getState().showToast('Event ini saja diperbarui')
    } else {
      await update(target.event.id, toEventInput(draft, target.event))
      useUiStore.getState().showToast('Perubahan disimpan')
    }
  }

  try {
    await run()
    return true
  } catch {
    withToastRetry('Event gagal disimpan.', () => void saveDraft(target, draft, scope))
    return false
  }
}

/** Delete an event, or only one repeat of a series. */
export async function deleteEvent(target: EditorTarget, scope: EditScope): Promise<boolean> {
  const event = target.event
  if (!event) return false
  const { remove, update, items } = useEventStore.getState()

  const run = async () => {
    if (target.occurrenceStart && scope === 'single') {
      const rule = event.recurrence
      if (!rule) throw new Error('Event ini bukan bagian dari rangkaian berulang.')
      const exceptions = [...rule.exceptions, toISODate(parseISO(target.occurrenceStart))]
      await update(event.id, { recurrence: { ...rule, exceptions } })
      // A repeat edited earlier is already detached; remove that copy too.
      const detached = items.find((e) => e.recurringEventId === event.id && e.originalStart === target.occurrenceStart)
      if (detached) await remove(detached.id)
      useUiStore.getState().showToast('Event ini saja dihapus')
      return
    }
    await remove(event.id)
    useUiStore.getState().showToast('Event dihapus')
  }

  try {
    await run()
    return true
  } catch {
    withToastRetry('Event gagal dihapus.', () => void deleteEvent(target, scope))
    return false
  }
}