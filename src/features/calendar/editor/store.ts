import { create } from 'zustand'
import { useUiStore } from '@/stores/ui'
import type { CalendarEvent } from '@/types/domain'
import type { EventDraft } from './eventDraft'

/** What the editor is currently working on. `event` is absent while creating. */
export interface EditorTarget {
  /** Incremented on every open, so reopening starts from a clean draft. */
  token: number
  event?: CalendarEvent
  /** ISO start of the repeat that was clicked. Set only for one occurrence of a recurring event. */
  occurrenceStart?: string
  /** Where the editor should start: a day, or the times a drag or quick create proposed. */
  prefill?: Partial<EventDraft>
}

/** True when the open item is a single occurrence and the change must be asked about. */
export const isSingleOccurrence = (target: EditorTarget) => Boolean(target.event?.recurrence && target.occurrenceStart)

interface EditorState {
  target: EditorTarget | null
  open: (target: Omit<EditorTarget, 'token'>) => void
  close: () => void
}

/**
 * Which event the right panel is editing. Deliberately not persisted: reopening the app
 * should never restore a half-written event.
 */
export const useEditorStore = create<EditorState>((set) => ({
  target: null,
  open: (target) => {
    // The editor lives in the context panel, which is a column on desktop and a drawer below.
    useUiStore.setState({ panelOpen: true, drawerOpen: true })
    set({ target: { ...target, token: Date.now() } })
  },
  close: () => set({ target: null }),
}))