import { Link } from 'react-router-dom'
import { FileDashed } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { linkButtonClass } from './linkButtonClass'

/** The page's shape while the notes load: a bar, then the sheet with a title and a few lines. */
export function NoteEditorSkeleton() {
  return (
    <div role="status" aria-label="Memuat catatan">
      <div className="flex items-center gap-2 border-b px-4 py-3 md:px-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <div className="p-0 lg:p-6">
        <div className="mx-auto w-full max-w-[720px] space-y-4 border bg-surface px-5 py-8 sm:px-12 sm:py-12 lg:rounded-card">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-3 w-24" />
          <div className="space-y-2.5 pt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function NoteMissing() {
  return (
    <div className="p-4 md:p-6">
      <EmptyState
        icon={FileDashed}
        title="Catatan tidak ditemukan"
        description="Catatan ini mungkin sudah dihapus, atau alamatnya salah."
        action={
          <Link to="/notes" className={linkButtonClass}>
            Kembali ke daftar catatan
          </Link>
        }
      />
    </div>
  )
}
