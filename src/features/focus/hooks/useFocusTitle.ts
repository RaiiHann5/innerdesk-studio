import { useEffect } from 'react'
import { MODE_LABEL, formatClock } from '../lib/time'
import type { FocusMode } from '@/types/domain'

/**
 * Owns the tab title: the countdown and the mode while a block is under way, the page's own title
 * otherwise.
 *
 * One owner matters. If the router also wrote the title on every navigation, the two would trade
 * blows for a second after each page change. Handing the title back is just writing `baseTitle`.
 */
export function useFocusTitle(remaining: number, mode: FocusMode, active: boolean, baseTitle: string) {
  useEffect(() => {
    document.title = active ? `${formatClock(remaining)} ${MODE_LABEL[mode]}` : baseTitle
  }, [remaining, mode, active, baseTitle])
}
