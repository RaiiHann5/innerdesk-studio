import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/**
 * Which data layer the app runs on. Supabase when both variables are set, otherwise localStorage.
 * Tests always run local, even when a developer has real keys in .env.local.
 */
export const BACKEND: 'supabase' | 'local' = import.meta.env.MODE !== 'test' && url && key ? 'supabase' : 'local'

/** The role claim of a JWT-shaped key, or null when it is not one. Never throws. */
function jwtRole(value: string): string | null {
  const payload = value.split('.')[1]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const role = (JSON.parse(json) as { role?: unknown }).role
    return typeof role === 'string' ? role : null
  } catch {
    return null
  }
}

/**
 * Everything in this bundle is readable by anyone who opens the site, so a key that bypasses Row Level Security
 * must never be here. Fails loudly at startup instead of shipping it.
 */
export function assertPublicConfig(apiUrl: string, apiKey: string): void {
  if (apiKey.startsWith('sb_secret_') || jwtRole(apiKey) === 'service_role') {
    throw new Error('VITE_SUPABASE_ANON_KEY berisi secret atau service_role key. Pakai anon atau publishable key saja.')
  }
  let parsed: URL
  try {
    parsed = new URL(apiUrl)
  } catch {
    throw new Error('VITE_SUPABASE_URL bukan alamat yang valid.')
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
  if (parsed.protocol !== 'https:' && !local) throw new Error('VITE_SUPABASE_URL harus memakai https.')
}

let client: SupabaseClient | null = null

/** The one Supabase client. Throws a readable error when the app is not configured for Supabase or the key is unsafe. */
export function supabase(): SupabaseClient {
  if (BACKEND !== 'supabase' || !url || !key) throw new Error('Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY.')
  if (!client) {
    assertPublicConfig(url, key)
    client = createClient(url, key, {
      // The session lives in localStorage and refreshes itself. No OAuth or magic links, so nothing is read from the URL.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  }
  return client
}
