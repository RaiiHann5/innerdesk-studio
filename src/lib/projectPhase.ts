import type { ProjectPhase } from '@/types/domain'

/** The four phases in the order a project moves through them. */
export const PHASES: readonly ProjectPhase[] = ['riset', 'desain', 'pengembangan', 'peluncuran']

export const PHASE_LABEL: Record<ProjectPhase, string> = {
  riset: 'Riset',
  desain: 'Desain',
  pengembangan: 'Pengembangan',
  peluncuran: 'Peluncuran',
}

export const phaseIndex = (phase: ProjectPhase): number => PHASES.indexOf(phase)

/** The phase after this one, or null once the project is at its last phase. */
export const nextPhase = (phase: ProjectPhase): ProjectPhase | null => PHASES[phaseIndex(phase) + 1] ?? null
