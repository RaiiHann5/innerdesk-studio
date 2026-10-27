import { Barbell, Briefcase, CloudSun, ForkKnife, Moon, Users, type Icon } from '@phosphor-icons/react'
import type { MoodFactor, MoodLevel } from '@/types/domain'

export const MOOD_LEVELS: MoodLevel[] = [1, 2, 3, 4, 5]

export const MOOD_LABEL: Record<MoodLevel, string> = {
  1: 'Berat',
  2: 'Kurang baik',
  3: 'Biasa',
  4: 'Baik',
  5: 'Sangat baik',
}

/** One hue in five steps: the accent at increasing strength. Defined in tokens.css. */
export const MOOD_FILL: Record<MoodLevel, string> = {
  1: 'bg-mood-1 text-mood-on-low',
  2: 'bg-mood-2 text-mood-on-low',
  3: 'bg-mood-3 text-mood-on-low',
  4: 'bg-mood-4 text-mood-on-high',
  5: 'bg-mood-5 text-mood-on-high',
}

export const MOOD_SWATCH: Record<MoodLevel, string> = {
  1: 'bg-mood-1',
  2: 'bg-mood-2',
  3: 'bg-mood-3',
  4: 'bg-mood-4',
  5: 'bg-mood-5',
}

export const FACTORS: Array<{ id: MoodFactor; label: string; icon: Icon }> = [
  { id: 'tidur', label: 'Tidur', icon: Moon },
  { id: 'olahraga', label: 'Olahraga', icon: Barbell },
  { id: 'makan', label: 'Makan', icon: ForkKnife },
  { id: 'sosial', label: 'Sosial', icon: Users },
  { id: 'kerja', label: 'Kerja', icon: Briefcase },
  { id: 'cuaca', label: 'Cuaca', icon: CloudSun },
]

export const FACTOR_BY_ID = Object.fromEntries(FACTORS.map((f) => [f.id, f])) as Record<MoodFactor, (typeof FACTORS)[number]>
