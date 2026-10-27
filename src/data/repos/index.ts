import { BACKEND } from '@/lib/supabase'
import type { Repos } from './interfaces'
import { createLocalRepos } from './local/createLocalRepos'
import { createSupabaseRepos } from './supabase/createSupabaseRepos'

/**
 * The only file that knows which implementation is in use: Supabase when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are set, localStorage otherwise (and always in tests). The vault repos hold ciphertext only and are not part of
 * `loadAllEntities`.
 */
const repos: Repos = BACKEND === 'supabase' ? createSupabaseRepos() : createLocalRepos()

export const {
  taskRepo, projectRepo, noteRepo, noteTemplateRepo, categoryRepo, eventRepo, moodRepo, journalRepo, focusRepo,
  vaultMetaRepo, vaultItemRepo, accountRepo, financeCategoryRepo, transactionRepo, budgetRepo, goalRepo, recurringRepo,
  habitRepo, habitLogRepo, libraryItemRepo, libraryLogRepo, libraryQuoteRepo,
} = repos
