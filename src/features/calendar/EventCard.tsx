import { FolderSimple, LinkSimple, MapPin } from '@phosphor-icons/react'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import type { CalendarEvent, Project } from '@/types/domain'
import { CATEGORY_STYLE } from './categories'
import { useCategories } from './hooks/useCategories'

export function EventCard({ event, project }: { event: CalendarEvent; project?: Project }) {
  const category = useCategories().byId.get(event.categoryId)
  const place = event.location ?? event.link
  const PlaceIcon = event.location ? MapPin : LinkSimple

  return (
    <article className="rounded-card border bg-surface p-3">
      <header className="flex items-center justify-between gap-2 text-xs text-muted">
        <span className="font-medium tabular-nums text-ink">
          {fmt(event.start, 'HH.mm')} sampai {fmt(event.end, 'HH.mm')}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className={cn('size-1.5 rounded-full', category ? CATEGORY_STYLE[category.colorToken].bar : 'bg-faint')} />
          {category?.name}
        </span>
      </header>
      <h3 className="mt-1.5 font-ui text-base font-medium leading-snug">{event.title}</h3>
      <div className="mt-2 space-y-1 text-xs text-muted">
        {place && (
          <p className="flex items-center gap-1.5">
            <PlaceIcon size={14} aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        )}
        {project && (
          <p className="flex items-center gap-1.5">
            <FolderSimple size={14} aria-hidden />
            <span className="truncate">{project.name}</span>
          </p>
        )}
      </div>
    </article>
  )
}
