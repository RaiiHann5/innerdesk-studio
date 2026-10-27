import type { Icon } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Page } from './Page'

interface Props {
  title: string
  description: string
  icon: Icon
  emptyTitle: string
  emptyDescription: string
}

/** Stand-in used until a page's phase is built. Deleted page by page. */
export function PhasePlaceholder({ title, description, icon, emptyTitle, emptyDescription }: Props) {
  return (
    <Page>
      <PageHeader title={title} description={description} />
      <EmptyState icon={icon} title={emptyTitle} description={emptyDescription} />
    </Page>
  )
}
