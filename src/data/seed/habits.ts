import { getISODay, parseISO } from 'date-fns'
import { isoDay } from '@/lib/date'
import type { Habit, HabitLog, SeedEntity } from '@/types/domain'

export const HABIT_IDS = {
  air: 'hab-air',
  olahraga: 'hab-olahraga',
  baca: 'hab-baca',
  tidur: 'hab-tidur',
  jurnal: 'hab-jurnal',
} as const

/** How many days of history the seed fills in, not counting today. */
const HISTORY = 44

interface Plan {
  habit: SeedEntity<Habit>
  /** Days ago the habit was due but missed. Everything else that is due was done. */
  missed: number[]
  /** Days ago a counted habit got about half of its target. */
  partial?: number[]
  /** What today already holds. Left out means nothing logged yet. */
  today?: number
  /** Journal entries by days ago. On a missed day the entry becomes a log with nothing done. */
  notes?: Record<number, string>
}

const base = (name: string, fields: Omit<Habit, 'id' | 'createdAt' | 'updatedAt' | 'name' | 'startDate' | 'order'>, order: number): SeedEntity<Habit> => ({
  name,
  startDate: isoDay(-HISTORY),
  order: order * 1000,
  ...fields,
})

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7]

const PLANS: Plan[] = [
  {
    habit: {
      id: HABIT_IDS.air,
      ...base('Minum air putih', { color: 'teal', icon: 'drop', days: ALL_DAYS, target: 8, unit: 'gelas' }, 1),
    },
    missed: [9, 17, 26, 33],
    partial: [2, 4, 12, 13, 21, 22, 29, 38],
    today: 3,
    notes: { 1: 'Bawa botol ke kantor, jadi gampang ngecek.', 9: 'Seharian rapat, lupa minum sampai sore.', 17: 'Perjalanan jauh, botol ketinggalan.' },
  },
  {
    habit: {
      id: HABIT_IDS.olahraga,
      ...base('Olahraga 30 menit', { color: 'clay', icon: 'barbell', days: [1, 3, 5, 6], target: 1, description: 'Jalan cepat, lari, atau latihan di rumah.' }, 2),
    },
    missed: [3, 8, 10, 15, 22, 29, 36],
    notes: { 3: 'Hujan deras, tidak jadi lari.', 8: 'Badan pegal, istirahat dulu.', 10: 'Lembur.' },
  },
  {
    habit: {
      id: HABIT_IDS.baca,
      ...base('Baca buku', { color: 'ochre', icon: 'book', days: ALL_DAYS, target: 15, unit: 'halaman' }, 3),
    },
    missed: [1, 6, 7, 14, 19, 20, 27, 31, 40],
    partial: [3, 11],
    notes: { 1: 'Ketiduran sebelum sempat buka buku.', 4: 'Selesai bab 3. Mulai seru.', 14: 'Terlalu capek, mata tidak kuat.' },
  },
  {
    habit: {
      id: HABIT_IDS.tidur,
      ...base('Tidur sebelum 23.00', { color: 'slate', icon: 'moon', days: ALL_DAYS, target: 1 }, 4),
    },
    missed: [2, 5, 6, 13, 16, 23, 24, 30, 37],
    today: undefined,
    notes: { 2: 'Begadang nonton bola.', 3: 'HP dimatikan jam 22.00, besoknya jauh lebih segar.' },
  },
  {
    habit: {
      id: HABIT_IDS.jurnal,
      ...base('Menulis jurnal', { color: 'moss', icon: 'pencil', days: ALL_DAYS, target: 1, description: 'Beberapa kalimat sudah cukup.' }, 5),
    },
    missed: [7, 8, 18, 28],
    today: undefined,
    notes: { 7: 'Hari yang kacau, tidak sempat duduk.' },
  },
]

export const seedHabits = (): SeedEntity<Habit>[] => PLANS.map((plan) => plan.habit)

export const seedHabitLogs = (): SeedEntity<HabitLog>[] => {
  const logs: SeedEntity<HabitLog>[] = []
  for (const { habit, missed, partial = [], today, notes = {} } of PLANS) {
    const target = habit.target ?? 1
    for (let ago = 0; ago <= HISTORY; ago++) {
      const date = isoDay(-ago)
      if (!habit.days?.includes(getISODay(parseISO(date)))) continue
      const note = ago === 0 ? undefined : notes[ago]
      let value: number
      if (ago === 0) {
        if (!today) continue
        value = today
      } else if (missed.includes(ago)) {
        // A missed day only gets a row when there is something written about it.
        if (note) logs.push({ habitId: habit.id as string, date, value: 0, note })
        continue
      } else {
        value = partial.includes(ago) ? Math.max(1, Math.floor(target / 2)) : target
      }
      logs.push({ habitId: habit.id as string, date, value, ...(note ? { note } : {}) })
    }
  }
  return logs
}
