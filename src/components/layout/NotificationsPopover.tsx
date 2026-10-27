import { Link } from 'react-router-dom'
import { Bell } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Popover } from '@/components/ui/Popover'
import { isoDay } from '@/lib/date'
import { useTaskStore } from '@/stores/entities'

export function NotificationsPopover() {
  const tasks = useTaskStore((s) => s.items)
  const today = isoDay(0)
  const open = tasks.filter((t) => t.status !== 'done' && !t.archivedAt && t.dueDate)
  const overdue = open.filter((t) => t.dueDate! < today)
  const dueToday = open.filter((t) => t.dueDate === today)
  const count = overdue.length + dueToday.length

  return (
    <Popover
      label="Notifikasi"
      renderTrigger={({ ref, ...props }) => (
        <span className="relative">
          <IconButton ref={ref} icon={Bell} label={count ? `Notifikasi, ${count} perlu perhatian` : 'Notifikasi'} {...props} />
          {count > 0 && <span aria-hidden className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" />}
        </span>
      )}
    >
      <div className="border-b px-4 py-3">
        <h2 className="text-md font-bold">Notifikasi</h2>
      </div>
      {count === 0 ? (
        <p className="px-4 py-6 text-sm text-muted">Tidak ada task yang jatuh tempo hari ini atau terlambat.</p>
      ) : (
        <ul className="max-h-72 divide-y overflow-y-auto">
          {[...overdue.map((t) => ({ t, late: true })), ...dueToday.map((t) => ({ t, late: false }))].map(({ t, late }) => (
            <li key={t.id}>
              <Link to="/tasks" className="block px-4 py-3 hover:bg-sunken">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className={late ? 'text-xs text-status-overdue' : 'text-xs text-muted'}>
                  {late ? 'Terlambat' : 'Jatuh tempo hari ini'}, <span className="tabular-nums">{t.id}</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Popover>
  )
}
