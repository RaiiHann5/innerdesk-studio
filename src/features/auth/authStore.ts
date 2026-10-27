import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

type Status = 'loading' | 'signed-out' | 'ready' | 'error'

interface AuthState {
  status: Status
  email: string | null
  /** Why startup failed (status "error"). */
  problem: string | null
  init: () => void
  signIn: (email: string, password: string) => Promise<string | null>
  /** Resolves to a message to show, or null when the account is signed in straight away. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; confirm: boolean }>
  signOut: () => Promise<void>
}

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email atau kata sandi salah.',
  email_not_confirmed: 'Email belum dikonfirmasi. Buka tautan di email kamu dulu.',
  user_already_exists: 'Email ini sudah terdaftar. Coba masuk.',
  weak_password: 'Kata sandi terlalu lemah. Pakai minimal 8 karakter.',
  signup_disabled: 'Pendaftaran dimatikan. Hubungi pemilik aplikasi.',
  over_request_rate_limit: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
  over_email_send_rate_limit: 'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.',
}
const authMessage = (error: { code?: string; message?: string }): string =>
  (error.code && MESSAGES[error.code]) || (/fetch|network/i.test(error.message ?? '') ? 'Tidak bisa menghubungi server. Periksa koneksi internet.' : 'Gagal masuk. Coba lagi.')

/** Defaults (categories) are created once per account by a database function, so two tabs cannot both seed. */
async function bootstrap(): Promise<void> {
  const { error } = await supabase().rpc('bootstrap_defaults')
  if (!error) return
  if (error.code === 'PGRST202' || error.code === '42883') throw new Error('Database belum siap. Jalankan migrasi di supabase/migrations lebih dulu.')
  throw new Error('Gagal menyiapkan akun. Coba lagi.')
}

let started = false

export const useAuthStore = create<AuthState>((set, get) => {
  const enter = async (email: string | null) => {
    try {
      await bootstrap()
      set({ status: 'ready', email, problem: null })
    } catch (e) {
      set({ status: 'error', problem: e instanceof Error ? e.message : 'Terjadi kesalahan.' })
    }
  }

  return {
    status: 'loading',
    email: null,
    problem: null,
    init() {
      if (started) return
      started = true
      try {
        const client = supabase()
        // Only record state in this callback; calling the client from inside it can deadlock.
        client.auth.onAuthStateChange((event) => {
          // Signed out here, in another tab, or the refresh token died: start clean so no data or vault key stays in memory.
          if (event === 'SIGNED_OUT' && get().status === 'ready') window.location.replace('/')
        })
        void client.auth.getSession().then(({ data }) => {
          if (data.session) void enter(data.session.user.email ?? null)
          else set({ status: 'signed-out' })
        })
      } catch (e) {
        set({ status: 'error', problem: e instanceof Error ? e.message : 'Konfigurasi Supabase tidak valid.' })
      }
    },
    async signIn(email, password) {
      const { data, error } = await supabase().auth.signInWithPassword({ email: email.trim(), password })
      if (error) return authMessage(error)
      set({ status: 'loading' })
      await enter(data.user.email ?? null)
      return null
    },
    async signUp(email, password) {
      const { data, error } = await supabase().auth.signUp({ email: email.trim(), password })
      if (error) return { error: authMessage(error), confirm: false }
      if (!data.session) return { error: null, confirm: true }
      set({ status: 'loading' })
      await enter(data.user?.email ?? null)
      return { error: null, confirm: false }
    },
    async signOut() {
      // This device only. A full reload afterwards drops every store and the in-memory vault key.
      await supabase().auth.signOut({ scope: 'local' })
      window.location.replace('/')
    },
  }
})
