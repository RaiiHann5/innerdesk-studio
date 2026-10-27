import type { TransactionFx } from '@/types/domain'
import type { TableSpec } from './codec'

/**
 * One entry per table, next to supabase/migrations. A field is its snake_case column unless given as [key, column].
 * Adding a field to a domain type means adding it here and in the migration: `toRow` throws on a key it does not know.
 */
export const specs = {
  projects: {
    table: 'projects',
    fields: ['name', 'description', 'status', 'phase', 'deadline', 'color', 'startDate', 'goal', 'milestones', 'links', 'archivedAt'],
    timestamps: ['archivedAt'],
  },
  tasks: {
    table: 'tasks',
    fields: [
      'title', 'description', 'status', 'priority', 'projectId', 'dueDate', 'dueTime', 'tags', 'noteCount', 'timeLog', 'focusCount',
      'completedAt', 'subtasks', 'estimateMinutes', 'recurrence', ['order', 'sort_order'], 'archivedAt',
    ],
    timestamps: ['completedAt', 'archivedAt'],
  },
  notes: {
    table: 'notes',
    fields: ['libraryItemId', 'title', 'content', 'excerpt', 'tags', 'pinned', 'projectId', 'archivedAt'],
    timestamps: ['archivedAt'],
  },
  noteTemplates: { table: 'note_templates', fields: ['name', 'description', 'title', 'content', 'tags'] },
  categories: { table: 'categories', fields: ['name', 'colorToken'] },
  events: {
    table: 'events',
    fields: [
      'title', ['start', 'starts_at'], ['end', 'ends_at'], 'allDay', 'categoryId', 'projectId', 'location', 'link', 'description',
      'recurrence', 'reminders', 'recurringEventId', 'originalStart',
    ],
    timestamps: ['start', 'end', 'originalStart'],
  },
  mood: { table: 'mood_entries', fields: ['date', 'level', 'factors', 'note'], order: ['date', 'id'] },
  journal: {
    table: 'journal_entries',
    fields: ['date', 'title', 'content', 'gratitude', 'learning', 'tags', 'excerpt'],
    order: ['date', 'id'],
  },
  focus: {
    table: 'focus_sessions',
    fields: ['mode', 'taskId', 'projectId', 'plannedSeconds', 'actualSeconds', 'startedAt', 'endedAt', 'completed'],
    timestamps: ['startedAt', 'endedAt'],
  },
  habits: {
    table: 'habits',
    fields: ['name', 'description', 'color', 'icon', 'days', 'target', 'unit', 'reminderTime', 'startDate', ['order', 'sort_order'], 'archivedAt'],
    timestamps: ['archivedAt'],
  },
  habitLogs: { table: 'habit_logs', fields: ['habitId', 'date', 'value', 'note'], order: ['date', 'id'] },
  libraryItems: {
    table: 'library_items',
    fields: [
      'kind', 'title', 'originalTitle', 'year', 'status', 'rating', 'review', 'reviewExcerpt', 'reviewHasSpoilers', 'synopsis', 'genres',
      'tags', 'favorite', 'coverUrl', 'accent', 'finishedAt', ['order', 'sort_order'], 'runtimeMin', 'director', ['cast', 'cast_members'],
      'crew', 'authors', 'pages', 'currentPage', 'publisher', 'isbn', 'format',
    ],
  },
  libraryLogs: { table: 'library_logs', fields: ['itemId', 'date', 'place', 'withWhom', 'fromPage', 'toPage', 'minutes'] },
  libraryQuotes: { table: 'library_quotes', fields: ['itemId', 'text', 'locator', 'comment'] },
  accounts: {
    table: 'accounts',
    fields: ['name', 'kind', 'currency', 'openingBalanceMinor', ['order', 'sort_order'], 'archivedAt'],
    timestamps: ['archivedAt'],
  },
  financeCategories: {
    table: 'finance_categories',
    fields: ['name', 'kind', ['order', 'sort_order'], 'archivedAt'],
    timestamps: ['archivedAt'],
  },
  transactions: {
    table: 'transactions',
    fields: [
      'date', 'kind', 'amountMinor', 'currency', 'accountId', 'toAccountId', 'toAmountMinor', 'categoryId', 'note', 'payee', 'projectId',
      'tags', 'recurringId',
    ],
    // The rate and base amount are stored as two columns and travel together, so a rate never exists without its amount.
    custom: {
      keys: ['fx'],
      read(row, out) {
        if (row.fx_rate != null && row.fx_base_amount_minor != null) {
          out.fx = { rate: Number(row.fx_rate), baseAmountMinor: Number(row.fx_base_amount_minor) } satisfies TransactionFx
        }
      },
      write(input, row) {
        if (!('fx' in input)) return
        const fx = input.fx as TransactionFx | undefined
        row.fx_rate = fx?.rate ?? null
        row.fx_base_amount_minor = fx?.baseAmountMinor ?? null
      },
    },
  },
  budgets: { table: 'budgets', fields: ['month', 'categoryId', 'limitMinor'] },
  // Contributions live in their own table; the goal repo reads and writes them.
  goals: {
    table: 'goals',
    fields: ['name', 'targetMinor', 'targetDate', 'archivedAt'],
    timestamps: ['archivedAt'],
    custom: { keys: ['contributions'], read() {}, write() {} },
  },
  recurring: {
    table: 'recurring',
    fields: ['name', 'kind', 'amountMinor', 'currency', 'accountId', 'categoryId', 'freq', 'interval', 'nextDate', 'active'],
  },
} satisfies Record<string, TableSpec>
