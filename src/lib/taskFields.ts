/** "frontend, revisi, frontend" becomes ["frontend", "revisi"]. Blanks and repeats are dropped. */
export const parseTags = (value: string): string[] => [...new Set(value.split(',').map((t) => t.trim()).filter(Boolean))]

/** Adds tags to the ones a task already has, without repeats and without reordering what was there. */
export const mergeTags = (existing: readonly string[], add: readonly string[]): string[] => [...new Set([...existing, ...add])]
