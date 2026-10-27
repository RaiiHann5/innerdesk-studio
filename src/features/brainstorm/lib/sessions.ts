import type { BrainstormSession } from '@/types/domain'

/** The Inbox Ide first, then the most recently touched. Does not change the list it is given. */
export function sortSessions(sessions: readonly BrainstormSession[]): BrainstormSession[] {
  return [...sessions].sort((a, b) => Number(Boolean(b.inbox)) - Number(Boolean(a.inbox)) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id))
}

/** "1 ide", "12 ide". Indonesian does not inflect, so only zero gets its own words. */
export const ideaCount = (n: number): string => (n === 0 ? 'Belum ada ide' : `${n} ide`)

/** Cuts a name for a tight spot such as a menu item. */
export const shorten = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`)
