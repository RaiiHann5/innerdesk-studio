import type {
  Account,
  Budget,
  CalendarEvent,
  Category,
  Entity,
  FinanceCategory,
  FocusSession,
  Goal,
  Habit,
  HabitLog,
  IsoRange,
  JournalEntry,
  LibraryItem,
  LibraryLog,
  LibraryQuote,
  MoodEntry,
  NewEntity,
  Note,
  NoteTemplate,
  Project,
  Recurring,
  Task,
  Transaction,
} from '@/types/domain'
import type { EncryptedItem, VaultMeta } from '@/lib/crypto/types'

/** Every repository is async so a remote database can replace localStorage without touching components. */
export interface Repo<T extends Entity> {
  list(): Promise<T[]>
  get(id: string): Promise<T | null>
  create(input: NewEntity<T>): Promise<T>
  update(id: string, patch: Partial<NewEntity<T>>): Promise<T>
  remove(id: string): Promise<void>
  /** Puts back an item that was removed, keeping its id and timestamps. Used by undo. */
  restore(item: T): Promise<T>
}

export type TaskRepo = Repo<Task>
export type ProjectRepo = Repo<Project>
export interface NoteRepo extends Repo<Note> {
  /** Notes whose title, excerpt or tags match every word of the query. */
  search(query: string): Promise<Note[]>
}
export type NoteTemplateRepo = Repo<NoteTemplate>
export type CategoryRepo = Repo<Category>
export interface EventRepo extends Repo<CalendarEvent> {
  /** Events that overlap the range, plus recurring masters that may produce occurrences in it. */
  listRange(range: IsoRange): Promise<CalendarEvent[]>
}
/**
 * A repo whose records are keyed by calendar day: at most one per `date`.
 * `create` behaves like `upsert`, so the one-per-day rule cannot be bypassed through the generic store.
 */
export interface DayRepo<T extends Entity & { date: string }> extends Repo<T> {
  /** Records whose date falls in [from, to], both yyyy-MM-dd and inclusive. */
  listRange(from: string, to: string): Promise<T[]>
  getByDate(date: string): Promise<T | null>
  /** Updates the record for `input.date` if there is one, otherwise creates it. */
  upsert(input: NewEntity<T>): Promise<T>
}

export type MoodRepo = DayRepo<MoodEntry>
export type JournalRepo = DayRepo<JournalEntry>
export interface FocusRepo extends Repo<FocusSession> {
  /** Sessions that started inside the range, so a week view only fetches the week. */
  listRange(range: IsoRange): Promise<FocusSession[]>
}

/**
 * The vault repos hold ciphertext only. They never see a plaintext item, a key or a password, and they are
 * deliberately not `Repo<T>`: the id comes from the client (it is part of the AAD) and writes are checked
 * against a key epoch. They are not loaded by `loadAllEntities`. See "Vault" in docs/fase-database.md.
 *
 * Every method throws on failure. `get()` returns null only when nothing is stored; stored data that
 * cannot be read or validated throws `VaultError('corrupt')`, so a damaged vault is never mistaken for an empty one.
 */
export interface VaultMetaRepo {
  get(): Promise<VaultMeta | null>
  /** First-time setup. Throws `conflict` if a vault already exists, so setup cannot overwrite one. */
  create(meta: VaultMeta): Promise<void>
  /** Compare-and-swap: `meta.revision` must be the stored revision + 1, otherwise `conflict`. */
  update(meta: VaultMeta): Promise<void>
  /**
   * Replaces the record without looking at what is stored. Only for restoring a verified backup over a vault that
   * can no longer be read, where `get()` throws and `update()` cannot compare. Never used for anything else.
   */
  overwrite(meta: VaultMeta): Promise<void>
}

export interface VaultItemRepo {
  list(): Promise<EncryptedItem[]>
  get(id: string): Promise<EncryptedItem | null>
  /** Insert or replace. `keyEpoch` must match the stored set, otherwise `conflict`. */
  put(item: EncryptedItem, keyEpoch: number): Promise<void>
  /** Removing something that is not there is not an error. */
  remove(id: string, keyEpoch: number): Promise<void>
  /** Puts back an item removed earlier, with the same ciphertext (undo). Throws `conflict` if the id exists. */
  restore(item: EncryptedItem, keyEpoch: number): Promise<void>
  /** Writes a complete replacement set aside. It has no effect on the live set until `settle` promotes it. */
  stageReplace(items: EncryptedItem[], keyEpoch: number): Promise<void>
  /**
   * Run after the meta record has been updated, and at every unlock. Promotes the staged set when its epoch
   * equals `currentKeyEpoch`, otherwise discards it. Safe to call when nothing is staged and safe to repeat.
   */
  settle(currentKeyEpoch: number): Promise<void>
  discardStaged(): Promise<void>
}

export type AccountRepo = Repo<Account>
export type FinanceCategoryRepo = Repo<FinanceCategory>
export type TransactionRepo = Repo<Transaction>
export type BudgetRepo = Repo<Budget>
export type GoalRepo = Repo<Goal>
export type RecurringRepo = Repo<Recurring>

export type HabitRepo = Repo<Habit>

/** Logs are keyed by (habitId, date): at most one per habit per day. */
export interface HabitLogRepo extends Repo<HabitLog> {
  /** Logs whose date falls in [from, to], both yyyy-MM-dd and inclusive. */
  listRange(from: string, to: string): Promise<HabitLog[]>
  /** Updates the log for (habitId, date) if there is one, otherwise creates it. Atomic per pair. */
  upsert(input: NewEntity<HabitLog>): Promise<HabitLog>
  /** Removes every log of a habit, for when the habit itself is deleted. Removing nothing is not an error. */
  removeForHabit(habitId: string): Promise<HabitLog[]>
}

export type LibraryItemRepo = Repo<LibraryItem>
export type LibraryLogRepo = Repo<LibraryLog>
export type LibraryQuoteRepo = Repo<LibraryQuote>

/** Everything `index.ts` exports. A backend is one function that returns all of them. */
export interface Repos {
  taskRepo: TaskRepo
  projectRepo: ProjectRepo
  noteRepo: NoteRepo
  noteTemplateRepo: NoteTemplateRepo
  categoryRepo: CategoryRepo
  eventRepo: EventRepo
  moodRepo: MoodRepo
  journalRepo: JournalRepo
  focusRepo: FocusRepo
  vaultMetaRepo: VaultMetaRepo
  vaultItemRepo: VaultItemRepo
  accountRepo: AccountRepo
  financeCategoryRepo: FinanceCategoryRepo
  transactionRepo: TransactionRepo
  budgetRepo: BudgetRepo
  goalRepo: GoalRepo
  recurringRepo: RecurringRepo
  habitRepo: HabitRepo
  habitLogRepo: HabitLogRepo
  libraryItemRepo: LibraryItemRepo
  libraryLogRepo: LibraryLogRepo
  libraryQuoteRepo: LibraryQuoteRepo
}
