import type { ReactNode } from 'react'
import { Archive, MagnifyingGlass, NotePencil, PushPin } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import type { NoteTab } from './lib/arrange'

interface NotesEmptyProps {
  tab: NoteTab
  query: string
  tag: string | null
  onClearFilters: () => void
  /** The "Catatan baru" button, for the states where writing a note is the way forward. */
  createButton: ReactNode
}

/** What an empty grid says, depending on whether filters caused it and which tab is open. */
export function NotesEmpty({ tab, query, tag, onClearFilters, createButton }: NotesEmptyProps) {
  const term = query.trim()
  if (term || tag) {
    return (
      <EmptyState
        icon={MagnifyingGlass}
        title="Catatan tidak ditemukan"
        description={term ? `Tidak ada catatan yang cocok dengan “${term}”.` : `Belum ada catatan dengan tag ${tag}.`}
        action={<Button onClick={onClearFilters}>Hapus filter</Button>}
      />
    )
  }
  if (tab === 'pinned') {
    return <EmptyState icon={PushPin} title="Belum ada catatan disematkan" description="Sematkan catatan penting lewat menu titik tiga supaya selalu mudah dibuka." />
  }
  if (tab === 'archived') {
    return <EmptyState icon={Archive} title="Arsip kosong" description="Catatan yang sudah selesai atau jarang dipakai bisa disimpan di sini lewat menu titik tiga." />
  }
  return (
    <EmptyState
      icon={NotePencil}
      title="Belum ada catatan aktif"
      description="Semua catatanmu ada di Arsip. Mulai yang baru kapan pun."
      action={createButton}
    />
  )
}
