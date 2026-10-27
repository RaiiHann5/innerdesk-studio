import { useId } from 'react'
import { Switch } from '@/components/ui/Switch'
import { ProjectLink } from '../ProjectLink'
import { TagInput } from '../TagInput'
import { PanelSection } from './PanelSection'

interface NoteSectionProps {
  tags: string[]
  tagPool: string[]
  projectId: string | undefined
  pinned: boolean
  onTags: (tags: string[]) => void
  onProject: (projectId: string | undefined) => void
  onPinned: (pinned: boolean) => void
}

/** What belongs to this note rather than to how it looks: tags, project and pin. Kept here so the paper stays clean. */
export function NoteSection({ tags, tagPool, projectId, pinned, onTags, onProject, onPinned }: NoteSectionProps) {
  const pinLabel = useId()
  return (
    <PanelSection title="Catatan">
      <div className="space-y-3">
        <TagInput tags={tags} onChange={onTags} suggestions={tagPool} />
        <ProjectLink projectId={projectId} onChange={onProject} />
        <div className="flex items-center justify-between gap-3">
          <span id={pinLabel} className="text-sm text-ink">
            Sematkan catatan
          </span>
          <Switch checked={pinned} onChange={onPinned} labelledBy={pinLabel} />
        </div>
      </div>
    </PanelSection>
  )
}
