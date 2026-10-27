import { useParams } from 'react-router-dom'
import { Page } from '@/components/layout/Page'
import { StoreGate } from '@/components/ui/StoreGate'
import { useHabitLogStore, useHabitStore, useMoodStore } from '@/stores/entities'
import { HabitsViewSkeleton } from '../HabitsView'
import { HabitDetail } from './HabitDetail'

const STORES = [useHabitStore, useHabitLogStore, useMoodStore]

/** /habits/:habitId: one habit in full, with its calendar, trends, milestones and its own journal. */
export default function HabitDetailPage() {
  const { habitId = '' } = useParams()
  return (
    <Page>
      <StoreGate stores={STORES} skeleton={<HabitsViewSkeleton />}>
        <HabitDetail habitId={habitId} />
      </StoreGate>
    </Page>
  )
}
