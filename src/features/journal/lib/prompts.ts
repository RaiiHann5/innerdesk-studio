/** Writing prompts, in the order they rotate. The first is the default question. */
export const JOURNAL_PROMPTS: readonly string[] = [
  'Apa yang paling berkesan hari ini?',
  'Satu hal kecil apa yang berjalan baik hari ini?',
  'Apa yang sedang kamu pikirkan, dan apa yang bisa dilepas dulu?',
  'Siapa yang membuat harimu sedikit lebih ringan?',
  'Apa yang kamu pelajari hari ini, sekecil apa pun?',
  'Kalau hari ini dibuat ulang, apa yang ingin kamu pertahankan?',
  'Apa yang tubuhmu butuhkan saat ini?',
  'Hal apa yang kamu tunda, dan apa langkah terkecilnya?',
  'Apa yang ingin kamu ingat dari minggu ini?',
  'Apa yang kamu syukuri hari ini, walau sedikit?',
  'Apa yang bikin kamu tersenyum belakangan ini?',
  'Apa yang ingin kamu lakukan lebih pelan?',
  'Apa yang kamu harapkan dari besok?',
  'Bagian mana dari hari ini yang ingin kamu ceritakan ke diri sendiri?',
]

const MS_PER_DAY = 86_400_000

/** Whole days since 1970-01-01 for a yyyy-MM-dd string, read as UTC so the time zone cannot shift it. */
function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY)
}

/**
 * The prompt for a day. The same date always gets the same prompt, and consecutive days get different ones.
 * `shift` is how many times the person pressed refresh: each press moves to the next prompt.
 */
export function promptForDate(date: string, shift = 0): string {
  const n = JOURNAL_PROMPTS.length
  return JOURNAL_PROMPTS[(((dayNumber(date) + shift) % n) + n) % n]
}
