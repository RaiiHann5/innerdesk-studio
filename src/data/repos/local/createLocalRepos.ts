import { parseISO } from 'date-fns'
import { searchNotes } from '@/features/notes/lib/search'
import type { Account, Budget, CalendarEvent, Category, FinanceCategory, FocusSession, Goal, Habit, JournalEntry, LibraryItem, LibraryLog, LibraryQuote, MoodEntry, Note, NoteTemplate, Project, Recurring, Task, Transaction } from '@/types/domain'
import { seedCategories } from '../../seed/categories'
import { seedEvents } from '../../seed/events'
import { seedAccounts, seedBudgets, seedFinanceCategories, seedGoals, seedRecurring, seedTransactions } from '../../seed/finance'
import { seedFocusSessions } from '../../seed/focusSessions'
import { seedHabitLogs, seedHabits } from '../../seed/habits'
import { seedLibraryItems, seedLibraryLogs, seedLibraryQuotes } from '../../seed/library'
import { seedJournal } from '../../seed/journal'
import { seedMood } from '../../seed/mood'
import { seedNotes } from '../../seed/notes'
import { seedProjects } from '../../seed/projects'
import { seedTasks } from '../../seed/tasks'
import { createLocalDayRepo } from './createLocalDayRepo'
import { createLocalHabitLogRepo } from './createLocalHabitLogRepo'
import { createLocalRepo, randomId } from './createLocalRepo'
import { createLocalVaultItemRepo, createLocalVaultMetaRepo } from './createLocalVaultRepos'
import { normalizeProjects, normalizeTasks } from '../normalize'
import { touchesRange } from './eventsInRange'
import type {
  AccountRepo,
  BudgetRepo,
  CategoryRepo,
  EventRepo,
  FinanceCategoryRepo,
  FocusRepo,
  GoalRepo,
  HabitLogRepo,
  HabitRepo,
  JournalRepo,
  LibraryItemRepo,
  LibraryLogRepo,
  LibraryQuoteRepo,
  MoodRepo,
  NoteRepo,
  NoteTemplateRepo,
  ProjectRepo,
  RecurringRepo,
  TaskRepo,
  TransactionRepo,
  VaultItemRepo,
  VaultMetaRepo,
  Repos,
} from '../interfaces'

/** localStorage implementation of every repo. Used when Supabase is not configured, and in tests. */
export function createLocalRepos(): Repos {
  const taskRepo: TaskRepo = createLocalRepo<Task>({
    key: 'tasks',
    seed: seedTasks,
    normalize: normalizeTasks,
    makeId: (items) => {
      const max = items.reduce((n, t) => Math.max(n, Number(t.id.split('-')[1]) || 0), 0)
      return `TSK-${max + 1}`
    },
  })
  const projectRepo: ProjectRepo = createLocalRepo<Project>({
    key: 'projects',
    seed: seedProjects,
    normalize: normalizeProjects,
    makeId: randomId('prj'),
  })
  // 'notes-v2': the first shape stored a plain-text `body`, which the editor document replaces.
  const noteStorage = createLocalRepo<Note>({ key: 'notes-v2', seed: seedNotes, makeId: randomId('note') })
  const noteRepo: NoteRepo = {
    ...noteStorage,
    async search(query) {
      return searchNotes(await noteStorage.list(), query)
    },
  }
  // Templates the person saved from a note. The built-in ones are code (features/notes/lib/templates.ts), so this starts empty.
  const noteTemplateRepo: NoteTemplateRepo = createLocalRepo<NoteTemplate>({ key: 'note-templates', seed: () => [], makeId: randomId('ntpl') })
  const categoryRepo: CategoryRepo = createLocalRepo<Category>({
    key: 'categories',
    seed: seedCategories,
    makeId: randomId('cat'),
  })
  const eventStorage = createLocalRepo<CalendarEvent>({ key: 'events-v2', seed: seedEvents, makeId: randomId('evt') })
  const eventRepo: EventRepo = {
    ...eventStorage,
    async listRange(range) {
      return (await eventStorage.list()).filter((event) => touchesRange(event, range))
    },
  }
  // 'mood-v2': the first mood shape (score, sleepHours) is abandoned rather than migrated, as with events-v2.
  const moodRepo: MoodRepo = createLocalDayRepo<MoodEntry>({ key: 'mood-v2', seed: seedMood, makeId: randomId('mood') })
  const journalRepo: JournalRepo = createLocalDayRepo<JournalEntry>({
    key: 'journal',
    seed: seedJournal,
    makeId: randomId('jrn'),
  })

  const focusStorage = createLocalRepo<FocusSession>({ key: 'focus-sessions', seed: seedFocusSessions, makeId: randomId('fcs') })
  const focusRepo: FocusRepo = {
    ...focusStorage,
    async listRange(range) {
      // A session belongs to the day it started on, so the range is matched against `startedAt`.
      const from = new Date(range.start)
      const to = new Date(range.end)
      return (await focusStorage.list()).filter((session) => {
        const started = parseISO(session.startedAt)
        return started < to && parseISO(session.endedAt) > from
      })
    },
  }

  /**
   * The vault holds ciphertext only and is NOT part of `loadAllEntities`: nothing in the vault is read at startup,
   * and nothing is decrypted until the person unlocks it. Keys: pos:v1:vault-meta, pos:v1:vault-items.
   */
  const vaultMetaRepo: VaultMetaRepo = createLocalVaultMetaRepo()
  const vaultItemRepo: VaultItemRepo = createLocalVaultItemRepo()

  // Keuangan. Each table is its own key, so the finance page reads and writes only what it needs.
  const accountRepo: AccountRepo = createLocalRepo<Account>({ key: 'finance-accounts', seed: seedAccounts, makeId: randomId('acc') })
  const financeCategoryRepo: FinanceCategoryRepo = createLocalRepo<FinanceCategory>({ key: 'finance-categories', seed: seedFinanceCategories, makeId: randomId('fcat') })
  const transactionRepo: TransactionRepo = createLocalRepo<Transaction>({ key: 'finance-transactions', seed: seedTransactions, makeId: randomId('tx') })
  const budgetRepo: BudgetRepo = createLocalRepo<Budget>({ key: 'finance-budgets', seed: seedBudgets, makeId: randomId('bud') })
  const goalRepo: GoalRepo = createLocalRepo<Goal>({ key: 'finance-goals', seed: seedGoals, makeId: randomId('goal') })
  const recurringRepo: RecurringRepo = createLocalRepo<Recurring>({ key: 'finance-recurring', seed: seedRecurring, makeId: randomId('rec') })

  // Kebiasaan. Logs are their own key: they grow by one row per habit per day, while habits barely change.
  const habitRepo: HabitRepo = createLocalRepo<Habit>({ key: 'habits', seed: seedHabits, makeId: randomId('hab') })
  const habitLogRepo: HabitLogRepo = createLocalHabitLogRepo({ key: 'habit-logs', seed: seedHabitLogs, makeId: randomId('hlog') })

  // Library. Three keys, not one: logs and quotes grow with use, and the items list is read far more often than it is written.
  // Only links to pictures are stored, never the pictures. See features/library for why.
  const libraryItemRepo: LibraryItemRepo = createLocalRepo<LibraryItem>({ key: 'library-items', seed: seedLibraryItems, makeId: randomId('lib') })
  const libraryLogRepo: LibraryLogRepo = createLocalRepo<LibraryLog>({ key: 'library-logs', seed: seedLibraryLogs, makeId: randomId('llog') })
  const libraryQuoteRepo: LibraryQuoteRepo = createLocalRepo<LibraryQuote>({ key: 'library-quotes', seed: seedLibraryQuotes, makeId: randomId('lqt') })

  return {
    taskRepo,
    projectRepo,
    noteRepo,
    noteTemplateRepo,
    categoryRepo,
    eventRepo,
    moodRepo,
    journalRepo,
    focusRepo,
    vaultMetaRepo,
    vaultItemRepo,
    accountRepo,
    financeCategoryRepo,
    transactionRepo,
    budgetRepo,
    goalRepo,
    recurringRepo,
    habitRepo,
    habitLogRepo,
    libraryItemRepo,
    libraryLogRepo,
    libraryQuoteRepo,
  }
}
