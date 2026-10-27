import { Pause, Play, ArrowCounterClockwise, SkipForward } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'

interface ControlsProps {
  running: boolean
  started: boolean
  onToggle: () => void
  onReset: () => void
  onSkip: () => void
}

/**
 * Mulai, Reset, Lewati.
 *
 * Reset and Lewati are secondary because both discard work: a reset throws the block away, a skip
 * records the time so far as a partial session and moves on. Neither is ever the thing you reach for
 * by accident.
 */
export function Controls({ running, started, onToggle, onReset, onSkip }: ControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Button onClick={onReset} disabled={!started} title="Reset (R)" className="h-10 px-4">
        <ArrowCounterClockwise aria-hidden />
        Reset
      </Button>

      <Button variant="primary" onClick={onToggle} title="Mulai atau jeda (Spasi)" className="h-11 min-w-40 px-6 text-md">
        {running ? (
          <>
            <Pause weight="fill" aria-hidden />
            Jeda
          </>
        ) : (
          <>
            <Play weight="fill" aria-hidden />
            {started ? 'Lanjut' : 'Mulai'}
          </>
        )}
      </Button>

      <Button onClick={onSkip} title="Lewati ke mode berikutnya (S)" className="h-10 px-4">
        <SkipForward aria-hidden />
        Lewati
      </Button>
    </div>
  )
}