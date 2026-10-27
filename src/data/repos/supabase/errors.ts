/** Codes the UI may want to branch on. Everything else is a generic failure. */
export type DataErrorCode = 'conflict' | 'not-found' | 'in-use' | 'invalid' | 'auth' | 'network' | 'unknown'

/**
 * A failed database call. The message is Indonesian, short and safe to show; it never carries SQL text,
 * column names or row data. The original error is kept in `cause` for debugging.
 */
export class DataError extends Error {
  readonly code: DataErrorCode
  constructor(code: DataErrorCode, message: string, cause?: unknown) {
    super(message, { cause })
    this.name = 'DataError'
    this.code = code
  }
}

interface PostgrestLike {
  code?: string
  message?: string
}

const MESSAGES: Record<DataErrorCode, string> = {
  conflict: 'Data sudah ada.',
  'not-found': 'Data tidak ditemukan.',
  'in-use': 'Data masih dipakai oleh data lain.',
  invalid: 'Data tidak valid.',
  auth: 'Sesi berakhir. Masuk lagi untuk melanjutkan.',
  network: 'Tidak bisa menghubungi server. Periksa koneksi internet.',
  unknown: 'Penyimpanan gagal. Coba lagi.',
}

function classify(error: PostgrestLike): DataErrorCode {
  const code = error.code ?? ''
  if (code === '23505' || code === 'VLT01') return 'conflict'
  if (code === '23503') return 'in-use'
  if (code === 'PGRST116') return 'not-found'
  // 23514 check violation, 23502 not null, 22xxx data exceptions (bad cast, out of range), 22P02 bad text representation.
  if (code === '23514' || code === '23502' || code.startsWith('22')) return 'invalid'
  // 42501 insufficient privilege (RLS), PGRST301/302 JWT problems.
  if (code === '42501' || code.startsWith('PGRST30') || /jwt/i.test(error.message ?? '')) return 'auth'
  if (code === '' && /fetch|network|failed to load/i.test(error.message ?? '')) return 'network'
  return 'unknown'
}

export function toDataError(error: PostgrestLike): DataError {
  const code = classify(error)
  return new DataError(code, MESSAGES[code], error)
}

export const isDataError = (error: unknown, code?: DataErrorCode): error is DataError =>
  error instanceof DataError && (code === undefined || error.code === code)
