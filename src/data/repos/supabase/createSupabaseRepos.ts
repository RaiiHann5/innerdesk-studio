import { touchesRange } from '../local/eventsInRange'
import { searchNotes } from '@/features/notes/lib/search'
import type { Account, Budget, CalendarEvent, Category, FinanceCategory, FocusSession, Habit, JournalEntry, LibraryItem, LibraryLog, LibraryQuote, MoodEntry, Note, NoteTemplate, Project, Recurring, Task, Transaction } from '@/types/domain'
import type { EventRepo, FocusRepo, NoteRepo, Repos } from '../interfaces'
import { createSupabaseDayRepo, createSupabaseHabitLogRepo } from './createSupabaseDayRepo'
import { createSupabaseGoalRepo } from './createSupabaseGoalRepo'
import { createSupabaseRepo, tableAccess } from './createSupabaseRepo'
import { createSupabaseVaultItemRepo, createSupabaseVaultMetaRepo } from './createSupabaseVaultRepos'
import { specs } from './tables'

/** Every repo on Supabase. Row Level Security scopes each one to the signed-in user, so no call names a user. */
export function createSupabaseRepos(): Repos {
  const noteStorage = createSupabaseRepo<Note>(specs.notes)
  const noteRepo: NoteRepo = {
    ...noteStorage,
    // Same matching as the local repo, so results do not change with the backend.
    async search(query) {
      return searchNotes(await noteStorage.list(), query)
    },
  }

  const events = tableAccess<CalendarEvent>(specs.events)
  const eventStorage = createSupabaseRepo<CalendarEvent>(specs.events)
  const eventRepo: EventRepo = {
    ...eventStorage,
    async listRange(range) {
      // The database drops everything that starts after the range; the exact overlap and recurrence rules are the same
      // function the local repo uses.
      const rows = await events.rows((q) => q.lt('starts_at', range.end))
      return rows.map(events.codec.fromRow).filter((event) => touchesRange(event, range))
    },
  }

  const focus = tableAccess<FocusSession>(specs.focus)
  const focusRepo: FocusRepo = {
    ...createSupabaseRepo<FocusSession>(specs.focus),
    async listRange(range) {
      // A session overlaps the range when it started before its end and ended after its start.
      const rows = await focus.rows((q) => q.lt('started_at', range.end).gt('ended_at', range.start))
      return rows.map(focus.codec.fromRow)
    },
  }

  return {
    taskRepo: createSupabaseRepo<Task>(specs.tasks),
    projectRepo: createSupabaseRepo<Project>(specs.projects),
    noteRepo,
    noteTemplateRepo: createSupabaseRepo<NoteTemplate>(specs.noteTemplates),
    categoryRepo: createSupabaseRepo<Category>(specs.categories),
    eventRepo,
    moodRepo: createSupabaseDayRepo<MoodEntry>(specs.mood),
    journalRepo: createSupabaseDayRepo<JournalEntry>(specs.journal),
    focusRepo,
    vaultMetaRepo: createSupabaseVaultMetaRepo(),
    vaultItemRepo: createSupabaseVaultItemRepo(),
    accountRepo: createSupabaseRepo<Account>(specs.accounts),
    financeCategoryRepo: createSupabaseRepo<FinanceCategory>(specs.financeCategories),
    transactionRepo: createSupabaseRepo<Transaction>(specs.transactions),
    budgetRepo: createSupabaseRepo<Budget>(specs.budgets),
    goalRepo: createSupabaseGoalRepo(),
    recurringRepo: createSupabaseRepo<Recurring>(specs.recurring),
    habitRepo: createSupabaseRepo<Habit>(specs.habits),
    habitLogRepo: createSupabaseHabitLogRepo(specs.habitLogs),
    libraryItemRepo: createSupabaseRepo<LibraryItem>(specs.libraryItems),
    libraryLogRepo: createSupabaseRepo<LibraryLog>(specs.libraryLogs),
    libraryQuoteRepo: createSupabaseRepo<LibraryQuote>(specs.libraryQuotes),
  }
}
