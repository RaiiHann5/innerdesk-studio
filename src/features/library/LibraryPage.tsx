import { useCallback, useState } from 'react'
import { Plus } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { StoreGate } from '@/components/ui/StoreGate'
import { useLibraryItemStore } from '@/stores/entities'
import type { LibraryKind } from '@/types/domain'
import { ItemFormDialog } from './add/ItemFormDialog'
import { LibraryView, LibraryViewSkeleton } from './LibraryView'

const STORES = [useLibraryItemStore]

/** /library: every film and book, as a shelf or a list, with what is in progress on top. */
export default function LibraryPage() {
  // `open` and `kind` are separate so the dialog can close without its form flashing to another kind.
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<LibraryKind>('film')
  const add = useCallback((next?: LibraryKind) => {
    if (next) setKind(next)
    setOpen(true)
  }, [])

  return (
    <Page>
      <PageHeader
        title="Library"
        description="Film yang kamu tonton dan buku yang kamu baca, dengan rating dan ulasanmu sendiri."
        actions={
          <Button variant="primary" onClick={() => add()} aria-keyshortcuts="n">
            <Plus weight="bold" aria-hidden />
            Tambah
          </Button>
        }
      />
      <StoreGate stores={STORES} skeleton={<LibraryViewSkeleton />}>
        <LibraryView onAdd={add} />
      </StoreGate>
      <ItemFormDialog open={open} kind={kind} onClose={() => setOpen(false)} />
    </Page>
  )
}
