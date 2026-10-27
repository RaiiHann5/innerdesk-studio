import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckSquare, MagnifyingGlass, Moon, Plus, Repeat, SidebarSimple, Sun, type Icon } from '@phosphor-icons/react'
import { ALL_NAV_ITEMS } from '@/app/nav'
import { Dialog } from '@/components/ui/Dialog'
import { cn } from '@/lib/cn'
import { fmt } from '@/lib/date'
import { newTask } from '@/lib/entityDefaults'
import { PRIORITY_LABEL } from '@/lib/labels'
import { parseQuickCapture } from '@/lib/quickCapture'
import { useTheme } from '@/lib/useTheme'
import { setHabitValue } from '@/features/habits/habitActions'
import { isComplete, isScheduled, indexLogs, valueOn } from '@/lib/habits'
import { toISODate } from '@/lib/date'
import { useHabitLogStore, useHabitStore, useProjectStore, useTaskStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'

interface Item {
  id: string
  group: string
  label: string
  hint?: string
  icon: Icon
  run: () => void | Promise<void>
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen)
  const setOpen = useUiStore((s) => s.setPaletteOpen)
  return (
    <Dialog open={open} onClose={() => setOpen(false)} label="Pencarian dan catat cepat" className="mt-[12vh] max-w-xl">
      <PaletteBody close={() => setOpen(false)} />
    </Dialog>
  )
}

function PaletteBody({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const { resolved, toggle: toggleTheme } = useTheme()
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const showToast = useUiStore((s) => s.showToast)
  const tasks = useTaskStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const habits = useHabitStore((s) => s.items)
  const habitLogs = useHabitLogStore((s) => s.items)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const items = useMemo<Item[]>(() => {
    const q = query.trim()
    const needle = q.toLowerCase()
    const result: Item[] = []

    if (q) {
      const parsed = parseQuickCapture(q, projects)
      const project = projects.find((p) => p.id === parsed.projectId)
      const hint = [
        PRIORITY_LABEL[parsed.priority],
        project?.name,
        parsed.dueDate && `tenggat ${fmt(parsed.dueDate, 'd MMM')}`,
      ]
        .filter(Boolean)
        .join(', ')
      result.push({
        id: 'capture',
        group: 'Catat cepat',
        label: `Buat task: ${parsed.title || q}`,
        hint,
        icon: Plus,
        run: async () => {
          if (!parsed.title) return showToast('Tulis judul task terlebih dahulu.')
          try {
            const task = await useTaskStore.getState().add(
              newTask(
                { title: parsed.title, status: 'todo', priority: parsed.priority, projectId: parsed.projectId, dueDate: parsed.dueDate },
                useTaskStore.getState().items,
              ),
            )
            showToast(`Task ${task.id} dibuat`)
            close()
          } catch (e) {
            showToast(e instanceof Error ? e.message : 'Task gagal dibuat.')
          }
        },
      })
      tasks
        .filter((t) => !t.archivedAt && t.title.toLowerCase().includes(needle))
        .slice(0, 5)
        .forEach((t) =>
          result.push({ id: `task-${t.id}`, group: 'Task', label: t.title, hint: t.id, icon: CheckSquare, run: () => navigate('/tasks') }),
        )
    }

    if (q) {
      // A habit that is due today and not yet done can be ticked off from here.
      const today = toISODate(new Date())
      const index = indexLogs(habitLogs)
      habits
        .filter((h) => !h.archivedAt && h.name.toLowerCase().includes(needle) && isScheduled(h, today) && !isComplete(h, valueOn(index, h.id, today)))
        .slice(0, 3)
        .forEach((h) =>
          result.push({
            id: `habit-${h.id}`,
            group: 'Kebiasaan',
            label: `Selesaikan kebiasaan: ${h.name}`,
            icon: Repeat,
            run: async () => {
              if (await setHabitValue(h, today, h.target)) showToast(`${h.name} selesai hari ini`)
            },
          }),
        )
    }

    const commands: Item[] = [
      ...ALL_NAV_ITEMS.map((n) => ({
        id: `nav-${n.to}`,
        group: 'Navigasi',
        label: `Buka ${n.label}`,
        icon: n.icon,
        run: () => navigate(n.to),
      })),
      {
        id: 'theme',
        group: 'Tampilan',
        label: resolved === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap',
        icon: resolved === 'dark' ? Sun : Moon,
        run: toggleTheme,
      },
      { id: 'sidebar', group: 'Tampilan', label: 'Ciutkan atau perluas sidebar', icon: SidebarSimple, run: toggleSidebar },
    ]
    result.push(...commands.filter((c) => !needle || c.label.toLowerCase().includes(needle)))
    return result
  }, [query, projects, tasks, habits, habitLogs, resolved, navigate, toggleTheme, toggleSidebar, showToast, close])

  useEffect(() => setActive(0), [query])
  useEffect(() => {
    document.getElementById(`cmd-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const choose = async (item: Item | undefined) => {
    if (!item) return
    await item.run()
    if (item.id !== 'capture') close()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (items.length ? (i + 1) % items.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (items.length ? (i - 1 + items.length) % items.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      void choose(items[active])
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 border-b px-4">
        <MagnifyingGlass aria-hidden className="shrink-0 text-muted" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded
          aria-controls="cmd-list"
          aria-activedescendant={items.length ? `cmd-opt-${active}` : undefined}
          aria-label="Cari atau tulis task baru"
          placeholder="Cari, atau tulis task baru. Contoh: Kirim invoice !tinggi besok"
          className="h-12 flex-1 bg-transparent text-md outline-none placeholder:text-sm"
        />
      </div>
      <ul id="cmd-list" role="listbox" aria-label="Hasil" className="max-h-80 overflow-y-auto p-2">
        {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Tidak ada hasil.</li>}
        {items.map((item, i) => {
          const showGroup = i === 0 || items[i - 1].group !== item.group
          const ItemIcon = item.icon
          return (
            <li key={item.id} role="presentation">
              {showGroup && <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{item.group}</p>}
              <div
                id={`cmd-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setActive(i)}
                onClick={() => void choose(item)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-control px-3 py-2 text-sm',
                  i === active && 'bg-sunken',
                )}
              >
                <ItemIcon aria-hidden className="shrink-0 text-muted" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.hint && <span className="shrink-0 text-xs tabular-nums text-muted">{item.hint}</span>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
