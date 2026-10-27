import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { STATUSES, STATUS_SHORT, statusLabel } from '@/lib/library'
import type { LibraryItem, LibraryStatus } from '@/types/domain'
import { setStatus } from './libraryActions'

/** Where the item stands. The short words fit the control; the full one ("Sedang dibaca") is read out and written under it. */
export function StatusControl({ item }: { item: LibraryItem }) {
  return (
    <div className="space-y-1">
      <SegmentedControl<LibraryStatus>
        label={`Status ${item.title}`}
        value={item.status}
        onChange={(status) => void setStatus(item, status)}
        options={STATUSES.map((value) => ({ value, label: STATUS_SHORT[value] }))}
      />
      <p className="text-xs text-muted">{statusLabel(item.kind, item.status)}</p>
    </div>
  )
}
