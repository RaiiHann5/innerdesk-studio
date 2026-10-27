import { X } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { useSettingsStore } from '@/stores/settings'
import { promptForDate } from './lib/prompts'

/** The day's writing prompt. Closing it hides it for that day only. */
export function PromptLine({ date }: { date: string }) {
  const dismissed = useSettingsStore((s) => s.dismissedPrompts.includes(date))
  const dismiss = useSettingsStore((s) => s.dismissPrompt)
  if (dismissed) return null
  return (
    <div className="flex items-start justify-between gap-2 rounded-control bg-sunken px-3 py-2">
      <p className="py-1 text-sm text-muted">
        <span className="sr-only">Pertanyaan pemantik: </span>
        {promptForDate(date)}
      </p>
      <IconButton icon={X} label="Tutup pertanyaan hari ini" className="size-7" onClick={() => dismiss(date)} />
    </div>
  )
}
