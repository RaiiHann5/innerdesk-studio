/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** https://<project-ref>.supabase.co. Kosong berarti mode lokal (localStorage). */
  readonly VITE_SUPABASE_URL?: string
  /** Anon key (JWT) atau publishable key (sb_publishable_...). Pernah service_role atau secret key: ditolak. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
