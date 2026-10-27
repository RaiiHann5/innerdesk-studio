import { isoDay } from '@/lib/date'
import type { MoodEntry, MoodFactor, MoodLevel, SeedEntity } from '@/types/domain'

type Row = [level: MoodLevel, factors: MoodFactor[], note?: string] | null

/** Oldest to newest: the 30 days before today. `null` is a day nothing was logged, as in real use. Today is left open for the check-in. */
const days: Row[] = [
  [3, ['kerja']],
  [3, ['tidur', 'kerja']],
  [4, ['olahraga', 'tidur'], 'Jalan pagi sebelum mulai kerja.'],
  [4, ['sosial', 'makan']],
  [2, ['kerja'], 'Begadang menyelesaikan revisi klien.'],
  null,
  [1, ['kerja', 'cuaca'], 'Hujan seharian, badan berat dan sulit fokus.'],
  [3, ['tidur']],
  [4, ['olahraga', 'tidur']],
  [5, ['olahraga', 'sosial', 'makan'], 'Libur. Sarapan bareng teman, lanjut jalan kaki.'],
  [4, ['sosial', 'tidur']],
  [3, ['kerja']],
  [3, ['makan', 'kerja']],
  [4, ['olahraga', 'makan']],
  [4, ['tidur', 'cuaca'], 'Cerah, kerja jadi lebih enak.'],
  null,
  [2, ['kerja', 'tidur'], 'Tidur kurang dari lima jam.'],
  [3, ['makan']],
  [4, ['olahraga', 'tidur']],
  [4, ['sosial']],
  [5, ['kerja', 'olahraga'], 'Demo ke klien lancar, fitur utama jalan.'],
  [4, ['tidur', 'makan']],
  [3, ['kerja'], 'Banyak rapat, tidak sempat istirahat.'],
  [3, ['cuaca']],
  [4, ['olahraga', 'sosial']],
  [4, ['tidur', 'olahraga']],
  null,
  [3, ['kerja'], 'Capek, tapi tenggat aman.'],
  [4, ['tidur', 'makan']],
  [3, ['kerja', 'cuaca']],
]

export const seedMood = (): SeedEntity<MoodEntry>[] =>
  days.flatMap((row, i) =>
    row ? [{ date: isoDay(i - days.length), level: row[0], factors: row[1], note: row[2] }] : [],
  )
