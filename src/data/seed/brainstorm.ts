import type { BrainstormSession, SeedEntity } from '@/types/domain'

/** The Inbox Ide: where quick capture lands. It starts empty, so nothing here pretends to be the person's own ideas. */
export const seedBrainstorm = (): SeedEntity<BrainstormSession>[] => [
  { title: 'Inbox Ide', question: 'Ide yang muncul di tengah pekerjaan, sebelum sempat dipilah.', inbox: true, ideas: [], clusters: [] },
]
