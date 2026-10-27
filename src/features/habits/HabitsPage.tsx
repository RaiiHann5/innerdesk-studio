import { useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreGate } from '@/components/ui/StoreGate'
import { useHabitLogStore, useHabitStore, useMoodStore } from '@/stores/entities'
import { HabitDialog } from './HabitDialog'
import { HabitsView, HabitsViewSkeleton } from './HabitsView'
import type { HabitPreset } from './habitUi'

const STORES = [useHabitStore, useHabitLogStore, useMoodStore]

/** /habits: today's habits with a check for each, the last week beside it, and the longer history under Statistik. */
export default function HabitsPage() {
  // `open` and `preset` are separate so the dialog can close without its form flashing back to empty.
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<HabitPreset | undefined>()

  const create = (next?: HabitPreset) => {
    setPreset(next)
    setOpen(true)
  }

  return (
    <Page>
      <PageHeader
        title="Kebiasaan"
        description="Hal kecil yang kamu ulang setiap hari, dan seberapa konsisten kamu melakukannya."
        actions={
          <Button variant="primary" onClick={() => create()}>
            <Plus weight="bold" aria-hidden />
            Kebiasaan baru
          </Button>
        }
      />
      <StoreGate stores={STORES} skeleton={<HabitsViewSkeleton />}>
        <HabitsView onCreate={create} />
      </StoreGate>
      <HabitDialog open={open} preset={preset} onClose={() => setOpen(false)} />
    </Page>
  )
}
