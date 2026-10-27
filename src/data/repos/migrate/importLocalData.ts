import { STORAGE_PREFIX } from '@/lib/config'
import { VaultError } from '@/lib/crypto/errors'
import { readJSON } from '@/lib/storage'
import type { Account, Budget, CalendarEvent, Category, Entity, FinanceCategory, FocusSession, Goal, Habit, HabitLog, JournalEntry, LibraryItem, LibraryLog, LibraryQuote, MoodEntry, Note, NoteTemplate, Project, Recurring, Task, Transaction } from '@/types/domain'
import * as remote from '..'
import type { Repo } from '../interfaces'
import { createLocalVaultItemRepo, createLocalVaultMetaRepo } from '../local/createLocalVaultRepos'
import { normalizeProjects, normalizeTasks } from '../normalize'
import { isDataError } from '../supabase/errors'

export interface ImportLine {
  label: string
  imported: number
  /** Already on the server (same id or same day), left as it is. */
  skipped: number
  failed: number
}

const CONCURRENCY = 6

/**
 * Copies what this browser kept in localStorage up to the signed-in account, keeping ids and timestamps.
 * Safe to run twice: rows that already exist are skipped, never overwritten. Nothing is deleted locally.
 *
 * It reads the raw storage keys on purpose. The local repos seed sample data when their key is empty, and sample data
 * must never be uploaded as if it were the person's own.
 */
const readLocal = <T>(key: string): T[] | null => readJSON<T[]>(STORAGE_PREFIX + key)

async function copyAll<T extends Entity>(label: string, items: T[] | null, put: (item: T) => Promise<unknown>): Promise<ImportLine> {
  const line: ImportLine = { label, imported: 0, skipped: 0, failed: 0 }
  for (let i = 0; i < (items?.length ?? 0); i += CONCURRENCY) {
    const results = await Promise.allSettled(items!.slice(i, i + CONCURRENCY).map(put))
    for (const result of results) {
      if (result.status === 'fulfilled') line.imported++
      else if (isDataError(result.reason, 'conflict') || (result.reason instanceof VaultError && result.reason.code === 'conflict')) line.skipped++
      else line.failed++
    }
  }
  return line
}

const byName = <T extends { id: string; name: string }>(items: T[]) => new Map(items.map((i) => [i.name.trim().toLowerCase(), i.id]))

export async function importLocalData(onStep?: (label: string) => void): Promise<ImportLine[]> {
  const report: ImportLine[] = []
  const step = async <T extends Entity>(label: string, key: string, repo: Repo<T>, prepare: (items: T[]) => T[] = (items) => items) => {
    onStep?.(label)
    const stored = readLocal<T>(key)
    report.push(await copyAll(label, stored && prepare(stored), (item) => repo.restore(item)))
  }

  // Default categories were created for the new account. Local ones with the same name reuse them (and events,
  // transactions and budgets are re-pointed), so nothing is duplicated and nothing is left dangling.
  const categoryMap = new Map<string, string>()
  const remoteCategories = byName(await remote.categoryRepo.list())
  const financeMap = new Map<string, string>()
  const remoteFinance = new Map((await remote.financeCategoryRepo.list()).map((c) => [`${c.kind}:${c.name.trim().toLowerCase()}`, c.id]))

  await step<Project>('Project', 'projects', remote.projectRepo, normalizeProjects)
  await step<Task>('Task', 'tasks', remote.taskRepo, normalizeTasks)
  await step<Note>('Catatan', 'notes-v2', remote.noteRepo)
  await step<NoteTemplate>('Template catatan', 'note-templates', remote.noteTemplateRepo)
  await step<Category>('Kategori kalender', 'categories', remote.categoryRepo, (items) =>
    items.filter((c) => {
      const existing = remoteCategories.get(c.name.trim().toLowerCase())
      if (existing) categoryMap.set(c.id, existing)
      return !existing
    }),
  )
  await step<CalendarEvent>('Event', 'events-v2', remote.eventRepo, (items) => items.map((e) => ({ ...e, categoryId: categoryMap.get(e.categoryId) ?? e.categoryId })))
  await step<MoodEntry>('Mood', 'mood-v2', remote.moodRepo)
  await step<JournalEntry>('Jurnal', 'journal', remote.journalRepo)
  await step<FocusSession>('Sesi fokus', 'focus-sessions', remote.focusRepo)
  await step<Habit>('Kebiasaan', 'habits', remote.habitRepo)
  await step<HabitLog>('Catatan kebiasaan', 'habit-logs', remote.habitLogRepo)
  await step<LibraryItem>('Library', 'library-items', remote.libraryItemRepo)
  await step<LibraryLog>('Log library', 'library-logs', remote.libraryLogRepo)
  await step<LibraryQuote>('Kutipan library', 'library-quotes', remote.libraryQuoteRepo)

  await step<Account>('Akun keuangan', 'finance-accounts', remote.accountRepo)
  await step<FinanceCategory>('Kategori keuangan', 'finance-categories', remote.financeCategoryRepo, (items) =>
    items.filter((c) => {
      const existing = remoteFinance.get(`${c.kind}:${c.name.trim().toLowerCase()}`)
      if (existing) financeMap.set(c.id, existing)
      return !existing
    }),
  )
  const refit = <T extends { categoryId?: string }>(items: T[]): T[] => items.map((i) => (i.categoryId ? { ...i, categoryId: financeMap.get(i.categoryId) ?? i.categoryId } : i))
  await step<Transaction>('Transaksi', 'finance-transactions', remote.transactionRepo, refit)
  await step<Budget>('Anggaran', 'finance-budgets', remote.budgetRepo, (items) => items.map((b) => ({ ...b, categoryId: financeMap.get(b.categoryId) ?? b.categoryId })))
  await step<Goal>('Target tabungan', 'finance-goals', remote.goalRepo)
  await step<Recurring>('Tagihan berulang', 'finance-recurring', remote.recurringRepo, refit)

  onStep?.('Vault')
  report.push(await importVault())
  return report
}

/** Ciphertext and wrapped keys move as they are. Nothing is decrypted, and an existing vault on the server is never replaced. */
async function importVault(): Promise<ImportLine> {
  const line: ImportLine = { label: 'Vault', imported: 0, skipped: 0, failed: 0 }
  try {
    const localMeta = createLocalVaultMetaRepo()
    const localItems = createLocalVaultItemRepo()
    const meta = await localMeta.get()
    if (!meta) return line
    if (await remote.vaultMetaRepo.get()) {
      line.skipped = 1
      return line
    }
    // Finish a rotation that was interrupted locally before reading the set.
    await localItems.settle(meta.keyEpoch)
    const items = await localItems.list()
    await remote.vaultMetaRepo.create(meta)
    const copied = await copyAll('Vault', items, (item) => remote.vaultItemRepo.restore(item, meta.keyEpoch))
    line.imported = 1 + copied.imported
    line.failed = copied.failed
    line.skipped = copied.skipped
  } catch {
    line.failed = 1
  }
  return line
}
