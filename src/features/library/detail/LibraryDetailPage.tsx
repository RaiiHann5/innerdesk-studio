import { useLocation, useParams } from 'react-router-dom'
import { Page } from '@/components/layout/Page'
import { StoreGate } from '@/components/ui/StoreGate'
import { useLibraryItemStore, useLibraryLogStore, useLibraryQuoteStore, useNoteStore } from '@/stores/entities'
import type { LibraryKind } from '@/types/domain'
import { LibraryViewSkeleton } from '../LibraryView'
import { ItemDetail } from './ItemDetail'

const STORES = [useLibraryItemStore, useLibraryLogStore, useLibraryQuoteStore, useNoteStore]

/** /library/film/:itemId and /library/buku/:itemId: the same page, told apart by the kind in the address. */
export default function LibraryDetailPage() {
  const { itemId = '' } = useParams()
  const kind: LibraryKind = useLocation().pathname.startsWith('/library/buku/') ? 'buku' : 'film'
  return (
    <Page>
      <StoreGate stores={STORES} skeleton={<LibraryViewSkeleton />}>
        <ItemDetail itemId={itemId} kind={kind} />
      </StoreGate>
    </Page>
  )
}
