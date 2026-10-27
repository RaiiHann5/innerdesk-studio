/** Height of one hour on the time grid, in px. Everything vertical is derived from this. */
export const HOUR_HEIGHT = 56
export const HOURS_PER_DAY = 24
/** Width of the hour gutter, in px. Day headers, the all-day row and the grid all share it. */
export const GUTTER_PX = 56
/** Shortest height an event is drawn at, so a 10 minute event is still readable and clickable. */
export const MIN_EVENT_MINUTES = 26
/** Where a range that does not contain today is scrolled to on first show: just above 06:00, so that hour's label is not cut by the pinned header. */
export const DEFAULT_SCROLL_MINUTES = 6 * 60 - 15

export const minutesToPx = (minutes: number) => (minutes / 60) * HOUR_HEIGHT

/** "UTC+8", "UTC+5:30", "UTC-3" for an offset in minutes east of UTC. */
export function timezoneLabel(offsetMinutes: number = -new Date().getTimezoneOffset()): string {
  if (offsetMinutes === 0) return 'UTC'
  const abs = Math.abs(offsetMinutes)
  const minutes = abs % 60
  return `UTC${offsetMinutes < 0 ? '-' : '+'}${Math.floor(abs / 60)}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''}`
}
