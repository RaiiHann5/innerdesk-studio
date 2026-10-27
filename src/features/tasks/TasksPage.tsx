import { Page } from '@/components/layout/Page'
import { PageHero } from '@/components/ui/PageHero'
import { TaskWorkspace } from './TaskWorkspace'

export default function TasksPage() {
  return (
    <Page>
      <PageHero title="Task" description="Semua task lintas project." art="grain" band="mid" flip />
      <TaskWorkspace />
    </Page>
  )
}
