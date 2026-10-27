export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
}

export type NewEntity<T extends Entity> = Omit<T, keyof Entity>
/** A seed may pin its id and timestamps; anything left out is filled in when the repo first loads. */
export type SeedEntity<T extends Entity> = NewEntity<T> & { id?: string; createdAt?: string; updatedAt?: string }

export type TaskStatus = 'todo' | 'doing' | 'review' | 'done'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type ProjectStatus = 'active' | 'paused' | 'done'
export type ProjectPhase = 'riset' | 'desain' | 'pengembangan' | 'peluncuran'

export interface TimeLogEntry {
  /** yyyy-MM-dd */
  date: string
  minutes: number
}

export interface Subtask {
  id: string
  title: string
  done: boolean
}

export type TaskRecurrenceFreq = 'daily' | 'weekly' | 'monthly'

/** A task repeats by creating its next copy when it is completed. Narrower than the calendar's Recurrence on purpose. */
export interface TaskRecurrence {
  freq: TaskRecurrenceFreq
  /** Every N units, at least 1. */
  interval: number
}

export interface Task extends Entity {
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  projectId?: string
  /** yyyy-MM-dd */
  dueDate?: string
  /** HH:mm. Together with a due date this puts the task on the time grid at that time. */
  dueTime?: string
  tags: string[]
  noteCount: number
  timeLog: TimeLogEntry[]
  /** Focus blocks finished on this task. */
  focusCount: number
  completedAt?: string
  subtasks: Subtask[]
  /** Planned effort in minutes. */
  estimateMinutes?: number
  recurrence?: TaskRecurrence
  /** Manual position inside the status column, ascending. Gaps, fractions and ties are allowed; ties break on createdAt, then id. */
  order: number
  /** ISO datetime. Archived tasks stay stored but are hidden from every view, stat and the calendar. */
  archivedAt?: string
}

export interface Milestone {
  id: string
  title: string
  /** yyyy-MM-dd */
  dueDate?: string
  done: boolean
}

export type ProjectLinkKind = 'akun' | 'dokumen' | 'desain' | 'lainnya'

/** A reference to something elsewhere. Never holds credentials: the url carries no user, password or token. */
export interface ProjectLinkItem {
  id: string
  title: string
  url: string
  kind: ProjectLinkKind
}

export interface Project extends Entity {
  name: string
  description?: string
  status: ProjectStatus
  phase: ProjectPhase
  /** yyyy-MM-dd */
  deadline?: string
  color: CategoryColor
  /** yyyy-MM-dd */
  startDate?: string
  goal?: string
  /** In the order the person arranged them. */
  milestones: Milestone[]
  links: ProjectLinkItem[]
  /** ISO datetime. Archived projects are hidden from the board and from the active project count. */
  archivedAt?: string
}

/** One node of a note's editor document (ProseMirror JSON). Structural on purpose, so the data layer never imports the editor. */
export interface NoteNode {
  type: string
  attrs?: Record<string, unknown>
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  content?: NoteNode[]
  text?: string
}

export interface NoteContent {
  type: 'doc'
  content: NoteNode[]
}

export interface Note extends Entity {
  /** The film or book this note is about, when it was written from its page in Library. */
  libraryItemId?: string
  title: string
  content: NoteContent
  /** Plain text, first ~160 characters of the body. Generated on save so lists never parse the document. */
  excerpt: string
  tags: string[]
  pinned: boolean
  projectId?: string
  archivedAt?: string
}

/** A starting point for a new note. The built-in ones live in code; the ones the person saves are stored. */
export interface NoteTemplate extends Entity {
  name: string
  description?: string
  /** What the new note is titled. May hold {{tanggal}}, which is filled in when the template is used. Empty means untitled. */
  title: string
  content: NoteContent
  tags: string[]
}

export type CategoryColor = 'moss' | 'ochre' | 'clay' | 'teal' | 'slate' | 'rosewood'

export interface Category extends Entity {
  name: string
  colorToken: CategoryColor
}

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface Recurrence {
  freq: RecurrenceFreq
  /** Every N units. Defaults to 1. */
  interval?: number
  /** ISO datetime; occurrences starting after it are dropped. */
  until?: string
  /** yyyy-MM-dd of occurrences removed or replaced by an override event. */
  exceptions: string[]
}

/** Minutes before the start: 10 menit, 1 jam, 1 hari. Fired by the reminder runtime while the app is open; an all-day event counts as starting at 09:00. */
export type ReminderOffset = 10 | 60 | 1440

export interface CalendarEvent extends Entity {
  title: string
  /** ISO datetime. For all-day events: local midnight of the first day. */
  start: string
  /** ISO datetime. Exclusive: for all-day events, local midnight after the last day. */
  end: string
  allDay: boolean
  categoryId: string
  projectId?: string
  location?: string
  link?: string
  description?: string
  recurrence?: Recurrence
  reminders: ReminderOffset[]
  /** Set on an override that replaces one occurrence of a recurring event. */
  recurringEventId?: string
  /** ISO start of the occurrence this override replaces. */
  originalStart?: string
}

/** Half-open ISO range [start, end). */
export interface IsoRange {
  start: string
  end: string
}

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export type MoodFactor = 'tidur' | 'olahraga' | 'makan' | 'sosial' | 'kerja' | 'cuaca'

/** One check-in per day. `date` is unique across entries. */
export interface MoodEntry extends Entity {
  /** yyyy-MM-dd */
  date: string
  level: MoodLevel
  factors: MoodFactor[]
  /** One line, optional. */
  note?: string
}

/** Rich-text document in the editor's JSON form: a ProseMirror node tree, which is what TipTap emits. */
export interface EditorDoc {
  type: string
  attrs?: Record<string, unknown>
  content?: EditorDoc[]
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
  text?: string
}

/** One writing space per day. `date` is unique across entries. */
export interface JournalEntry extends Entity {
  /** yyyy-MM-dd */
  date: string
  /** Legacy: older entries have a title. The journal no longer edits it but keeps it. */
  title?: string
  /** The "Sorotan" section: what went well today, as rich text. */
  content: EditorDoc
  /** Things the person is grateful for, one line each. */
  gratitude?: string[]
  /** The "Pelajaran" section, plain text. */
  learning?: string
  /** Topics of the day, shown as chips and used to filter the history. */
  tags?: string[]
  /** Plain-text preview derived from the entry, so lists and search never walk the document tree. */
  excerpt: string
}

export interface City {
  name: string
  admin?: string
  country?: string
  latitude: number
  longitude: number
}

export type FocusMode = 'focus' | 'short' | 'long'

/** One pomodoro run. A session the person reset or skipped is still stored, with `completed` false. */
export interface FocusSession extends Entity {
  mode: FocusMode
  taskId?: string
  projectId?: string
  plannedSeconds: number
  /** Time actually spent, which is less than planned for a reset or a skip. */
  actualSeconds: number
  startedAt: string
  endedAt: string
  completed: boolean
}

export interface FocusSettings {
  focusMin: number
  shortMin: number
  longMin: number
  /** A long break replaces the short one after this many focus sessions. */
  longEvery: number
  autoStart: boolean
  sound: boolean
  /** 0 to 1. */
  volume: number
  notifications: boolean
  characterOn: boolean
  reduceMotion: boolean
}

// ---------------------------------------------------------------------------------------------
// Keuangan
// ---------------------------------------------------------------------------------------------

export type CurrencyCode = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'JPY'
export type AccountKind = 'tunai' | 'bank' | 'ewallet' | 'investasi'
export type TransactionKind = 'expense' | 'income' | 'transfer'
export type FinanceCategoryKind = 'income' | 'expense'
export type RecurringFreq = 'weekly' | 'monthly' | 'yearly'

/** Only a nickname. Never a card or account number. */
export interface Account extends Entity {
  name: string
  kind: AccountKind
  currency: CurrencyCode
  /** In the account's own minor unit. */
  openingBalanceMinor: number
  order: number
  archivedAt?: string
}

export interface FinanceCategory extends Entity {
  name: string
  kind: FinanceCategoryKind
  order: number
  archivedAt?: string
}

/** The rate and base-currency amount fixed when the transaction was recorded. Never recomputed from today's rate. */
export interface TransactionFx {
  rate: number
  baseAmountMinor: number
}

export interface Transaction extends Entity {
  /** yyyy-MM-dd, no time zone. */
  date: string
  kind: TransactionKind
  amountMinor: number
  currency: CurrencyCode
  fx?: TransactionFx
  accountId: string
  /** Transfers only. */
  toAccountId?: string
  /** Transfers between currencies only: what the destination account received, in its own minor unit. */
  toAmountMinor?: number
  categoryId?: string
  note?: string
  payee?: string
  projectId?: string
  tags: string[]
  recurringId?: string
}

export interface Budget extends Entity {
  /** yyyy-MM. One budget per (month, category). */
  month: string
  categoryId: string
  limitMinor: number
}

export interface GoalContribution {
  id: string
  date: string
  amountMinor: number
  note?: string
}

/** Money set aside inside savings that already exist. Contributions never change an account balance. */
export interface Goal extends Entity {
  name: string
  targetMinor: number
  targetDate?: string
  contributions: GoalContribution[]
  archivedAt?: string
}

export interface Recurring extends Entity {
  name: string
  kind: 'income' | 'expense'
  amountMinor: number
  currency: CurrencyCode
  accountId: string
  categoryId?: string
  freq: RecurringFreq
  interval: number
  /** Moves forward only when the person presses Catat. Nothing records by itself. */
  nextDate: string
  active: boolean
}

// ---------------------------------------------------------------------------------------------
// Kebiasaan
// ---------------------------------------------------------------------------------------------

export type HabitIconKey =
  | 'drop'
  | 'barbell'
  | 'book'
  | 'moon'
  | 'sun'
  | 'heart'
  | 'brain'
  | 'pencil'
  | 'leaf'
  | 'coffee'
  | 'walk'
  | 'bicycle'
  | 'apple'
  | 'target'
  | 'star'

export interface Habit extends Entity {
  name: string
  description?: string
  color: CategoryColor
  icon: HabitIconKey
  /** ISO weekdays the habit is due on: 1 is Monday, 7 is Sunday. Never empty. All seven means every day. */
  days: number[]
  /** How much counts as done for one day. 1 is a plain check; more is a count, such as 8 glasses. */
  target: number
  /** What is being counted, such as "gelas" or "halaman". Only meaningful when `target` is above 1. */
  unit?: string
  /** HH:mm local time. On a due day that is not yet complete, a reminder fires then while the app is open. */
  reminderTime?: string
  /** yyyy-MM-dd. Days before this never count against the habit, so a new habit does not start with a pile of misses. */
  startDate: string
  /** Manual position in the list, ascending. Gaps and fractions are allowed. */
  order: number
  /** ISO datetime. Archived habits stay stored with their history but leave the daily list, the dashboard and every count. */
  archivedAt?: string
}

/**
 * What happened with one habit on one day: how much was done, and optionally a few words about it.
 * At most one per (habitId, date). A day with nothing done and nothing written has no log at all.
 */
export interface HabitLog extends Entity {
  habitId: string
  /** yyyy-MM-dd */
  date: string
  /** How much was done. 0 only when there is a `note`, such as the reason a day was skipped. At or past the habit's `target` the day is complete. */
  value: number
  /** The habit's journal entry for that day. Kept even when the day is later unticked. */
  note?: string
}

// ---------------------------------------------------------------------------------------------
// Library: film dan buku
// ---------------------------------------------------------------------------------------------

export type LibraryKind = 'film' | 'buku'
/** Want to, in progress, finished, gave up. The labels differ by kind ("Ingin ditonton", "Ingin dibaca"). */
export type LibraryStatus = 'planned' | 'active' | 'done' | 'dropped'
export type BookFormat = 'cetak' | 'ebook' | 'audio'

export interface CastMember {
  name: string
  character?: string
}

export interface CrewMember {
  name: string
  /** "Penulis", "Sinematografi", "Komposer". */
  job: string
}

/**
 * One film or one book. A single flat shape rather than a union of two: the repos and stores are generic over one
 * entity type, and the fields that only apply to one kind are simply left empty on the other.
 */
export interface LibraryItem extends Entity {
  kind: LibraryKind
  title: string
  originalTitle?: string
  year?: number
  status: LibraryStatus
  /** Half-stars as a whole number from 1 to 10, so 4.5 stars is 9 and nothing is ever a float. Unset means not rated. */
  rating?: number
  review?: NoteContent
  /** Plain text of the review, for lists and search. */
  reviewExcerpt?: string
  /** A review marked this way stays blurred until the reader asks for it. */
  reviewHasSpoilers?: boolean
  synopsis?: string
  genres: string[]
  tags: string[]
  favorite?: boolean
  /** Only ever a link. Pictures are never stored: localStorage is small, and some sources forbid keeping their images. */
  coverUrl?: string
  /** Colour of the typographic cover and of the page's accent. Left empty it comes from the title. */
  accent?: CategoryColor
  /** yyyy-MM-dd. Set when the item is marked finished. */
  finishedAt?: string
  /** Position among items of the same kind, ascending. */
  order: number

  // Film
  runtimeMin?: number
  director?: string
  cast?: CastMember[]
  crew?: CrewMember[]

  // Buku
  authors?: string[]
  pages?: number
  currentPage?: number
  publisher?: string
  isbn?: string
  format?: BookFormat
}

/** One viewing of a film, or one sitting with a book. */
export interface LibraryLog extends Entity {
  itemId: string
  /** yyyy-MM-dd */
  date: string
  // Film
  place?: string
  withWhom?: string
  // Buku
  fromPage?: number
  toPage?: number
  minutes?: number
}

/** A passage or a scene worth keeping, with where it is and what the person thought. */
export interface LibraryQuote extends Entity {
  itemId: string
  text: string
  /** "hlm. 142" for a book, "1:23:40" for a film. */
  locator?: string
  comment?: string
}
