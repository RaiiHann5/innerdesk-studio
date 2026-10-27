import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import { EmptyState } from '@/components/ui/EmptyState'
import { Tabs, panelId, tabId, type TabItem } from '@/components/ui/Tabs'
import { useLibraryItemStore, useLibraryLogStore, useLibraryQuoteStore, useNoteStore } from '@/stores/entities'
import type { LibraryKind } from '@/types/domain'
import { detailPath } from '../libraryUi'
import { DetailHero } from './DetailHero'
import { LogPanel } from './LogPanel'
import { NotesPanel } from './NotesPanel'
import { OverviewPanel } from './OverviewPanel'
import { QuotesPanel } from './QuotesPanel'
import { ReviewPanel } from './ReviewPanel'

type Tab = 'ikhtisar' | 'ulasan' | 'kutipan' | 'catatan' | 'riwayat'
const TAB_VALUES: Tab[] = ['ikhtisar', 'ulasan', 'kutipan', 'catatan', 'riwayat']
const PREFIX = 'libd'
const isTab = (value: string | null): value is Tab => TAB_VALUES.includes(value as Tab)

const backLink = (
  <Link to="/library" viewTransition className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
    <ArrowLeft aria-hidden />
    Library
  </Link>
)

/** One film or book in full. The route says which kind it expects; an address with the wrong kind is sent to the right one. */
export function ItemDetail({ itemId, kind }: { itemId: string; kind: LibraryKind }) {
  const item = useLibraryItemStore((s) => s.items.find((i) => i.id === itemId))
  const quotes = useLibraryQuoteStore((s) => s.items.filter((q) => q.itemId === itemId).length)
  const logs = useLibraryLogStore((s) => s.items.filter((l) => l.itemId === itemId).length)
  const notes = useNoteStore((s) => s.items.filter((n) => n.libraryItemId === itemId && !n.archivedAt).length)
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: Tab = isTab(raw) ? raw : 'ikhtisar'

  if (!item) {
    return (
      <div className="space-y-4">
        {backLink}
        <EmptyState icon={ArrowLeft} title="Tidak ditemukan" description="Mungkin sudah dihapus." />
      </div>
    )
  }
  if (item.kind !== kind) return <Navigate to={detailPath(item)} replace />

  const tabs: TabItem<Tab>[] = [
    { value: 'ikhtisar', label: 'Ikhtisar' },
    { value: 'ulasan', label: 'Ulasanku' },
    { value: 'kutipan', label: item.kind === 'film' ? 'Adegan & kutipan' : 'Kutipan & sorotan', count: quotes },
    { value: 'catatan', label: 'Catatan', count: notes },
    { value: 'riwayat', label: 'Riwayat', count: logs },
  ]

  return (
    <div className="space-y-5">
      {backLink}
      <DetailHero item={item} />
      <Tabs items={tabs} value={tab} onChange={(next) => setParams(next === 'ikhtisar' ? {} : { tab: next }, { replace: true })} label={`Bagian ${item.title}`} idPrefix={PREFIX} />
      <div role="tabpanel" id={panelId(PREFIX, tab)} aria-labelledby={tabId(PREFIX, tab)} tabIndex={0} className="outline-offset-4">
        {tab === 'ikhtisar' && <OverviewPanel item={item} />}
        {tab === 'ulasan' && <ReviewPanel item={item} />}
        {tab === 'kutipan' && <QuotesPanel item={item} />}
        {tab === 'catatan' && <NotesPanel item={item} />}
        {tab === 'riwayat' && <LogPanel item={item} />}
      </div>
    </div>
  )
}
