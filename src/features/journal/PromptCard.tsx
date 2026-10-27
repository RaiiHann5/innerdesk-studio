import { useState } from 'react'
import { ArrowsClockwise, PencilSimpleLine } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { promptForDate } from './lib/prompts'

interface PromptCardProps {
  date: string
  /** Moves the cursor into the highlights box. */
  onAnswer: () => void
}

/** The day's question. Refresh steps to the next one; it starts over from the day's own question on another day. */
export function PromptCard({ date, onAnswer }: PromptCardProps) {
  const [shift, setShift] = useState(0)
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-t-card bg-accent-soft px-4 py-4 md:px-6">
      <div className="min-w-0 flex-1 basis-72">
        <p className="text-xs font-medium text-accent-text">Pertanyaan hari ini</p>
        <p className="mt-1 font-display text-lg font-bold leading-snug tracking-tight">{promptForDate(date, shift)}</p>
      </div>
      <div className="flex items-center gap-1">
        <IconButton icon={ArrowsClockwise} label="Ganti pertanyaan" onClick={() => setShift((n) => n + 1)} />
        <Button onClick={onAnswer}>
          <PencilSimpleLine size={14} aria-hidden />
          Tulis jawaban
        </Button>
      </div>
    </div>
  )
}
