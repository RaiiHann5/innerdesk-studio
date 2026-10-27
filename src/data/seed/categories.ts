import type { Category, SeedEntity } from '@/types/domain'

export const CATEGORY_IDS = {
  kerja: 'cat-kerja',
  belajar: 'cat-belajar',
  pribadi: 'cat-pribadi',
  olahraga: 'cat-olahraga',
  keluarga: 'cat-keluarga',
  perjalanan: 'cat-perjalanan',
} as const

export const seedCategories = (): SeedEntity<Category>[] => [
  { id: CATEGORY_IDS.kerja, name: 'Kerja', colorToken: 'slate' },
  { id: CATEGORY_IDS.belajar, name: 'Belajar', colorToken: 'teal' },
  { id: CATEGORY_IDS.pribadi, name: 'Pribadi', colorToken: 'rosewood' },
  { id: CATEGORY_IDS.olahraga, name: 'Olahraga', colorToken: 'moss' },
  { id: CATEGORY_IDS.keluarga, name: 'Keluarga', colorToken: 'ochre' },
  { id: CATEGORY_IDS.perjalanan, name: 'Perjalanan', colorToken: 'clay' },
]
