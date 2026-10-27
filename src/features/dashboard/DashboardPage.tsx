import { useSearchParams } from 'react-router-dom'
import { ContextPanel } from '@/components/layout/ContextPanel'
import { Page } from '@/components/layout/Page'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { LatestNote } from '@/features/notes/LatestNote'
import { DashboardHeader } from './DashboardHeader'
import { LatestWork } from './panel/LatestWork'
import { TimeManagement } from './panel/TimeManagement'
import { CalendarView } from './views/CalendarView'
import { HabitView } from './views/HabitView'
import { MoodView } from './views/MoodView'
import { ProjectView } from './views/ProjectView'
import { TaskView } from './views/TaskView'

type View = 'task' | 'project' | 'note' | 'calendar' | 'habit' | 'mood'

const TABS: TabItem<View>[] = [
  { value: 'task', label: 'Task' },
  { value: 'project', label: 'Project' },
  { value: 'note', label: 'Latest note' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'habit', label: 'Kebiasaan' },
  { value: 'mood', label: 'Mood tracker' },
]

const VIEWS: Record<View, () => JSX.Element> = {
  task: TaskView,
  project: ProjectView,
  note: LatestNote,
  calendar: CalendarView,
  habit: HabitView,
  mood: MoodView,
}

const PREFIX = 'dash'
const isView = (v: string | null): v is View => TABS.some((t) => t.value === v)

export default function DashboardPage() {
  const [params, setParams] = useSearchParams()
  const raw = params.get('view')
  const view: View = isView(raw) ? raw : 'task'
  const ActiveView = VIEWS[view]

  return (
    <div className="flex h-full">
      <div className="min-w-0 flex-1 overflow-y-auto">
        <Page>
          <DashboardHeader />
          <Tabs
            items={TABS}
            value={view}
            onChange={(next) => setParams(next === 'task' ? {} : { view: next }, { replace: true })}
            label="Tampilan dashboard"
            idPrefix={PREFIX}
          />
          <div role="tabpanel" id={panelId(PREFIX, view)} aria-labelledby={tabId(PREFIX, view)} tabIndex={0} className="outline-offset-4">
            <ActiveView />
          </div>
        </Page>
      </div>
      <ContextPanel label="Ringkasan">
        <div className="space-y-8">
          <TimeManagement />
          <LatestWork />
        </div>
      </ContextPanel>
    </div>
  )
}
