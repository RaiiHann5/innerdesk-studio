import { useState } from 'react'
import { ArrowRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/cn'
import { PHASES, PHASE_LABEL, nextPhase, phaseIndex } from '@/lib/projectPhase'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { Project } from '@/types/domain'
import { advancePhase } from './projectActions'
import { useProjectStore } from '@/stores/entities'

/**
 * The four phases as a plain row of segments: earlier ones filled dark, the current one in the accent, later
 * ones empty. The state is also written in words for screen readers. One button moves to the next phase.
 */
export function PhaseStepper({ project }: { project: Project }) {
  const showToast = useUiStore((s) => s.showToast)
  const [busy, setBusy] = useState(false)
  const current = phaseIndex(project.phase)
  const next = nextPhase(project.phase)

  const advance = async () => {
    setBusy(true)
    const from = project.phase
    try {
      const to = await advancePhase(project)
      if (to) {
        showToast(`Project masuk fase ${PHASE_LABEL[to].toLowerCase()}.`, {
          label: 'Urungkan',
          run: () => void useProjectStore.getState().update(project.id, { phase: from }).catch(() => showToast('Fase gagal dikembalikan.')),
        })
      }
    } catch {
      toastWithRetry('Fase belum bisa diubah.', () => advancePhase(project))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="phase-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="phase-heading" className="text-md font-bold">
          Fase
        </h3>
        {next ? (
          <Button onClick={() => void advance()} disabled={busy}>
            Lanjut ke fase berikutnya
            <ArrowRight aria-hidden />
          </Button>
        ) : (
          <span className="text-sm text-muted">Fase terakhir</span>
        )}
      </div>
      <ol className="grid grid-cols-4 gap-2">
        {PHASES.map((phase, i) => {
          const state = i < current ? 'selesai' : i === current ? 'saat ini' : 'berikutnya'
          return (
            <li key={phase} aria-current={i === current ? 'step' : undefined}>
              <span aria-hidden className={cn('block h-1 rounded-full', i < current ? 'bg-ink' : i === current ? 'bg-accent' : 'bg-line')} />
              <span className={cn('mt-1.5 block text-xs sm:text-sm', i === current ? 'font-medium' : 'text-muted')}>{PHASE_LABEL[phase]}</span>
              <span className="sr-only">{state}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
