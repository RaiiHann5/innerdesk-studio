import { useMemo } from 'react'
import { useCategoryStore } from '@/stores/entities'
import type { Category } from '@/types/domain'

export function useCategories() {
  const categories = useCategoryStore((s) => s.items)
  const byId = useMemo(() => new Map<string, Category>(categories.map((c) => [c.id, c])), [categories])
  return { categories, byId }
}
