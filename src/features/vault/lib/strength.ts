/**
 * A local, rough estimate of how hard a typed password is to guess. It is labelled "perkiraan" everywhere
 * it is shown, because no offline heuristic can know how a person really chose their password.
 * No network call, no breach lookup, nothing leaves the device.
 *
 * It deliberately errs low: a repeated character, a keyboard row or a run like 1234 adds almost nothing,
 * a very common password is capped, and a typed password is discounted against truly random output.
 * Words separated by spaces or hyphens are scored as a passphrase at about 12 bits per distinct word.
 */
export type StrengthLevel = 0 | 1 | 2 | 3 | 4
export const STRENGTH_LABELS = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'] as const

export interface Strength {
  /** Estimated bits of entropy. Meaningless as a precise number. */
  bits: number
  level: StrengthLevel
  label: (typeof STRENGTH_LABELS)[number]
  /** Short, specific advice in Indonesian. At most three. */
  hints: string[]
}

const COMMON = new Set([
  'password', 'passw0rd', 'katasandi', 'katasandi123', 'sandi', 'admin', 'administrator', 'welcome', 'letmein', 'login',
  'qwerty', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', 'iloveyou', 'monkey', 'dragon', 'master', 'sunshine', 'princess',
  'football', 'baseball', 'abc123', 'secret', 'rahasia', 'indonesia', 'jakarta', 'bismillah', 'sayangku', 'cintaku',
  'rahasiaku', 'rahasia123', 'inipassword', 'passwordku', 'vault', 'innerdesk', 'changeme', 'trustno1', 'whatever', 'freedom',
])

const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890', '0987654321']
const HUMAN_DISCOUNT = 0.6
const BITS_PER_PASSPHRASE_WORD = 12
const LEVEL_FLOORS = [28, 40, 60, 80] as const
export const RECOMMENDED_MIN_LENGTH = 12

/** Indexes that add (almost) nothing: repeats, +1/-1 runs of 3 or more, and keyboard-row runs of 4 or more. */
function predictableIndexes(chars: string[]): Set<number> {
  const marked = new Set<number>()
  for (let i = 1; i < chars.length; i++) if (chars[i] === chars[i - 1]) marked.add(i)

  const codes = chars.map((c) => c.codePointAt(0)!)
  for (const step of [1, -1]) {
    let runStart = 0
    for (let i = 1; i <= codes.length; i++) {
      if (i < codes.length && codes[i] - codes[i - 1] === step) continue
      if (i - runStart >= 3) for (let j = runStart + 1; j < i; j++) marked.add(j)
      runStart = i
    }
  }

  const lower = chars.join('').toLowerCase()
  for (const row of KEYBOARD_ROWS) {
    for (const source of [row, [...row].reverse().join('')]) {
      for (let start = 0; start + 4 <= source.length; start++) {
        const chunk = source.slice(start, start + 4)
        let at = lower.indexOf(chunk)
        while (at !== -1) {
          for (let j = at + 1; j < at + 4; j++) marked.add(j)
          at = lower.indexOf(chunk, at + 1)
        }
      }
    }
  }
  return marked
}

function poolSize(text: string): number {
  let pool = 0
  if (/[a-z]/.test(text)) pool += 26
  if (/[A-Z]/.test(text)) pool += 26
  if (/[0-9]/.test(text)) pool += 10
  if (/[ -/:-@[-`{-~]/.test(text)) pool += 33
  if (/[^\x00-\x7F]/.test(text)) pool += 64
  return pool
}

const deLeet = (text: string) => text.replace(/@/g, 'a').replace(/0/g, 'o').replace(/\$/g, 's')

function isCommon(lower: string): boolean {
  const stripped = lower.replace(/[\d\W_]+$/g, '')
  return COMMON.has(lower) || COMMON.has(stripped) || COMMON.has(deLeet(lower)) || COMMON.has(deLeet(stripped))
}

export function estimateStrength(password: string): Strength {
  const text = password.normalize('NFKC')
  const chars = [...text]
  const hints: string[] = []

  if (chars.length === 0) return { bits: 0, level: 0, label: STRENGTH_LABELS[0], hints }

  const pool = poolSize(text)
  const predictable = predictableIndexes(chars)
  const unique = new Set(chars).size
  const effectiveLength = Math.min(
    chars.reduce((sum, _, index) => sum + (predictable.has(index) ? 0.25 : 1), 0),
    unique * 2,
  )
  let bits = effectiveLength * Math.log2(Math.max(pool, 2)) * HUMAN_DISCOUNT

  const words = text.split(/[\s\-_.,]+/).filter(Boolean)
  const isPassphrase = words.length >= 3 && words.every((word) => /^\p{L}{2,}$/u.test(word))
  if (isPassphrase) {
    const distinct = new Set(words.map((word) => word.toLowerCase())).size
    bits = Math.min(bits, distinct * BITS_PER_PASSPHRASE_WORD)
    if (distinct < 5) hints.push('Tambahkan kata acak sampai 5 atau 6 kata.')
  }

  const lower = text.toLowerCase()
  if (isCommon(lower)) {
    bits = Math.min(bits, 12)
    hints.push('Ini mirip kata sandi yang sangat umum.')
  }
  if (predictable.size >= Math.max(3, chars.length / 3)) hints.push('Hindari pengulangan dan urutan seperti aaaa, 1234 atau qwerty.')
  if (chars.length < RECOMMENDED_MIN_LENGTH) hints.unshift(`Terlalu pendek: minimal ${RECOMMENDED_MIN_LENGTH} karakter.`)
  if (!isPassphrase && chars.length >= RECOMMENDED_MIN_LENGTH && bits < LEVEL_FLOORS[2] && hints.length === 0) {
    hints.push('Frasa sandi dari 5 atau 6 kata acak lebih kuat dan lebih mudah diingat.')
  }

  let level = LEVEL_FLOORS.filter((floor) => bits >= floor).length as StrengthLevel
  if (chars.length < RECOMMENDED_MIN_LENGTH) level = Math.min(level, 1) as StrengthLevel
  return { bits: Math.round(bits), level, label: STRENGTH_LABELS[level], hints: hints.slice(0, 3) }
}
