import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { MoveScope } from './moveActions'

interface RecurringPromptProps {
  open: boolean
  /** A drag asks about the move; the editor asks about the edit. */
  action: 'save' | 'delete' | 'move'
  onChoose: (scope: MoveScope) => void
  onClose: () => void
}

const COPY = {
  move: {
    title: 'Event ini bagian dari sebuah rangkaian',
    description: 'Pemindahan berlaku untuk event yang dipilih saja, atau untuk seluruh rangkaian?',
  },
  save: {
    title: 'Event ini bagian dari sebuah rangkaian',
    description: 'Perubahan berlaku untuk event yang dipilih saja, atau untuk seluruh rangkaian?',
  },
  delete: {
    title: 'Hapus event berulang ini?',
    description: 'Hapus yang mana dari rangkaian ini?',
  },
} as const

/**
 * The single "this event only, or the whole series" question. Shared by the editor and by drops,
 * so the wording and the button order stay identical wherever it appears.
 */
export function RecurringPrompt({ open, action, onChoose, onClose }: RecurringPromptProps) {
  const copy = COPY[action]
  return (
    <ConfirmDialog
      open={open}
      label="Event berulang"
      title={copy.title}
      description={copy.description}
      choices={[
        { label: 'Event ini saja', onClick: () => onChoose('single') },
        { label: 'Semua event berulang', onClick: () => onChoose('series'), primary: true },
      ]}
      onClose={onClose}
    />
  )
}