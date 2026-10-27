import { categoryRepo, eventRepo, focusRepo, habitLogRepo, habitRepo, journalRepo, libraryItemRepo, libraryLogRepo, libraryQuoteRepo, moodRepo, noteRepo, noteTemplateRepo, projectRepo, taskRepo } from '@/data/repos'
import type { CalendarEvent, Category, FocusSession, Habit, HabitLog, IsoRange, JournalEntry, LibraryItem, LibraryLog, LibraryQuote, MoodEntry, Note, NoteTemplate, Project, Task } from '@/types/domain'
import { createEntityStore } from './createEntityStore'

export const useTaskStore = createEntityStore<Task>(taskRepo)
export const useProjectStore = createEntityStore<Project>(projectRepo)
export const useNoteStore = createEntityStore<Note>(noteRepo)
export const useNoteTemplateStore = createEntityStore<NoteTemplate>(noteTemplateRepo)
export const useEventStore = createEntityStore<CalendarEvent>(eventRepo)
export const useCategoryStore = createEntityStore<Category>(categoryRepo)
export const useMoodStore = createEntityStore<MoodEntry>(moodRepo)
export const useJournalStore = createEntityStore<JournalEntry>(journalRepo)
export const useFocusStore = createEntityStore<FocusSession>(focusRepo)
export const useLibraryItemStore = createEntityStore<LibraryItem>(libraryItemRepo)
export const useLibraryLogStore = createEntityStore<LibraryLog>(libraryLogRepo)
export const useLibraryQuoteStore = createEntityStore<LibraryQuote>(libraryQuoteRepo)
export const useHabitStore = createEntityStore<Habit>(habitRepo)
export const useHabitLogStore = createEntityStore<HabitLog>(habitLogRepo)

export const loadAllEntities = () =>
  Promise.all([
    useTaskStore.getState().load(),
    useProjectStore.getState().load(),
    useNoteStore.getState().load(),
    useEventStore.getState().load(),
    useMoodStore.getState().load(),
    useJournalStore.getState().load(),
    useCategoryStore.getState().load(),
    useFocusStore.getState().load(),
    useNoteTemplateStore.getState().load(),
    useHabitStore.getState().load(),
    useHabitLogStore.getState().load(),
    useLibraryItemStore.getState().load(),
    useLibraryLogStore.getState().load(),
    useLibraryQuoteStore.getState().load(),
  ])

/** Merges events for a range into the event store, so a view loads only what it shows once the repo is remote. */
export async function loadEventRange(range: IsoRange): Promise<void> {
  const fetched = await eventRepo.listRange(range)
  useEventStore.setState((state) => {
    const byId = new Map(state.items.map((e) => [e.id, e]))
    for (const event of fetched) byId.set(event.id, event)
    return { items: [...byId.values()] }
  })
}

/** The same idea for focus sessions: a week view fetches a week, not everything ever recorded. */
export async function loadFocusRange(range: IsoRange): Promise<void> {
  const fetched = await focusRepo.listRange(range)
  useFocusStore.setState((state) => {
    const byId = new Map(state.items.map((s) => [s.id, s]))
    for (const session of fetched) byId.set(session.id, session)
    return { items: [...byId.values()] }
  })
}
