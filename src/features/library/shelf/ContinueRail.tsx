import { Link } from 'react-router-dom'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { creditOf, progressOf } from '@/lib/library'
import type { LibraryItem } from '@/types/domain'
import { CoverImage } from '../CoverImage'
import { detailPath } from '../libraryUi'

/** What is being watched or read right now. The most opened part of the page, so it comes first and is the largest. */
export function ContinueRail({ items }: { items: LibraryItem[] }) {
  if (items.length === 0) return null
  return (
    <section aria-labelledby="library-rail" className="space-y-2">
      <h2 id="library-rail" className="text-sm font-medium text-muted">
        Sedang berlangsung
      </h2>
      <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {items.map((item) => {
          const progress = progressOf(item)
          return (
            <li key={item.id} className="w-72 shrink-0 snap-start">
              <Link to={detailPath(item)} viewTransition className="flex h-full gap-3 rounded-card border bg-surface p-3 transition-colors duration-fast hover:border-faint">
                <div className="w-16 shrink-0">
                  <CoverImage item={item} size="sm" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="line-clamp-2 font-medium leading-snug">{item.title}</h3>
                  <p className="truncate text-xs text-muted">{creditOf(item)}</p>
                  <div className="mt-auto pt-2">
                    {progress ? (
                      <>
                        <ProgressBar value={progress.percent} label={`Progres ${item.title}`} />
                        <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                          {progress.page} / {progress.pages} hlm
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-muted">{item.kind === 'film' ? 'Sedang ditonton' : 'Sedang dibaca'}</p>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
