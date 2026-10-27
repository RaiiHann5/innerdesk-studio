import { brainstormRepo } from '@/data/repos'
import { createEntityStore } from '@/stores/createEntityStore'
import type { BrainstormSession } from '@/types/domain'

export const useBrainstormStore = createEntityStore<BrainstormSession>(brainstormRepo)

/** Loads the sessions if they have not loaded yet. Nothing runs at app start: only the brainstorm page calls it. */
export const loadBrainstorm = (): Promise<void> => (useBrainstormStore.getState().status === 'idle' ? useBrainstormStore.getState().load() : Promise.resolve())
