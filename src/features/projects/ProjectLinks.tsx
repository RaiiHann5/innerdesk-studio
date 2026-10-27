import { useState, type FormEvent } from 'react'
import { ArrowSquareOut, Copy, Link as LinkIcon, PencilSimple, Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Field, controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { Menu, type MenuItem } from '@/components/ui/Menu'
import { LINK_KINDS, LINK_KIND_LABEL, checkLinkUrl, groupLinks, linkHost, newLinkId, safeHref } from '@/lib/projectLinks'
import { toastWithRetry } from '@/stores/retryToast'
import { useUiStore } from '@/stores/ui'
import type { Project, ProjectLinkItem, ProjectLinkKind } from '@/types/domain'
import { saveLinks } from './projectActions'

type Editing = { mode: 'new' } | { mode: 'edit'; id: string } | null

/** The Tautan tab: addresses for this project's accounts, documents and designs, grouped by kind. */
export function ProjectLinks({ project }: { project: Project }) {
  const showToast = useUiStore((s) => s.showToast)
  const [editing, setEditing] = useState<Editing>(null)
  const groups = groupLinks(project.links)

  const save = (next: ProjectLinkItem[]) => saveLinks(project, next)

  const remove = (link: ProjectLinkItem) => {
    const before = project.links
    save(before.filter((l) => l.id !== link.id)).then(
      () => showToast('Tautan dihapus.', { label: 'Urungkan', run: () => void save(before).catch(() => showToast('Tautan gagal dikembalikan.')) }),
      () => toastWithRetry('Tautan gagal dihapus.', () => save(project.links.filter((l) => l.id !== link.id))),
    )
  }
  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      showToast('Tautan disalin.')
    } catch {
      showToast('Tautan belum bisa disalin.')
    }
  }

  const form = editing && (
    <LinkForm
      key={editing.mode === 'edit' ? editing.id : 'new'}
      initial={editing.mode === 'edit' ? project.links.find((l) => l.id === editing.id) : undefined}
      onCancel={() => setEditing(null)}
      onSubmit={async (value) => {
        const next = editing.mode === 'edit' ? project.links.map((l) => (l.id === editing.id ? { ...l, ...value } : l)) : [...project.links, { id: newLinkId(), ...value }]
        await save(next)
        setEditing(null)
      }}
    />
  )

  if (project.links.length === 0 && !editing) {
    return (
      <EmptyState
        icon={LinkIcon}
        title="Belum ada tautan"
        description="Simpan alamat halaman penting project ini: akun, dokumen, atau desain."
        action={
          <Button variant="primary" onClick={() => setEditing({ mode: 'new' })}>
            Tambah tautan
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-muted">{project.links.length} tautan</p>
        {!editing && (
          <Button variant="primary" onClick={() => setEditing({ mode: 'new' })}>
            <Plus weight="bold" aria-hidden />
            Tambah tautan
          </Button>
        )}
      </div>
      {editing?.mode === 'new' && form}

      {groups.map((group) => (
        <section key={group.kind} aria-labelledby={`links-${group.kind}`} className="space-y-2">
          <h3 id={`links-${group.kind}`} className="text-sm font-medium text-muted">
            {LINK_KIND_LABEL[group.kind]} <span className="tabular-nums">{group.links.length}</span>
          </h3>
          <ul className="divide-y rounded-card border bg-surface">
            {group.links.map((link) =>
              editing?.mode === 'edit' && editing.id === link.id ? (
                <li key={link.id} className="p-3">
                  {form}
                </li>
              ) : (
                <LinkRow key={link.id} link={link} onCopy={() => void copy(link.url)} onEdit={() => setEditing({ mode: 'edit', id: link.id })} onRemove={() => remove(link)} />
              ),
            )}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LinkRow({ link, onCopy, onEdit, onRemove }: { link: ProjectLinkItem; onCopy: () => void; onEdit: () => void; onRemove: () => void }) {
  // Stored data is not trusted: anything that is not a plain web address is shown as text and never becomes an href.
  const href = safeHref(link.url)
  const items: MenuItem[] = [
    { label: 'Ubah', icon: PencilSimple, onSelect: onEdit },
    { label: 'Hapus', icon: Trash, tone: 'danger', onSelect: onRemove },
  ]
  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <div className="min-w-0 flex-1">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1.5 rounded-chip font-medium hover:underline">
            <span className="truncate">{link.title}</span>
            <ArrowSquareOut aria-hidden size={14} className="shrink-0 text-muted" />
            <span className="sr-only">(buka di tab baru)</span>
          </a>
        ) : (
          <span className="block truncate font-medium">{link.title}</span>
        )}
        <span className="block truncate text-xs text-muted">{href ? linkHost(href) : 'Alamat tidak valid'}</span>
      </div>
      {href && <IconButton icon={Copy} label={`Salin tautan ${link.title}`} onClick={onCopy} />}
      <Menu label={`Aksi tautan ${link.title}`} items={items} />
    </li>
  )
}

interface LinkValue {
  title: string
  url: string
  kind: ProjectLinkKind
}

function LinkForm({ initial, onSubmit, onCancel }: { initial?: ProjectLinkItem; onSubmit: (value: LinkValue) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')
  const [kind, setKind] = useState<ProjectLinkKind>(initial?.kind ?? 'dokumen')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const checked = checkLinkUrl(url)
    if (!checked.ok) return setError(checked.error)
    setSaving(true)
    try {
      await onSubmit({ title: title.trim() || checked.url, url: checked.url, kind })
    } catch {
      setError('Tautan gagal disimpan. Coba lagi.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-card border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="Alamat" htmlFor="link-url">
          <input
            id="link-url"
            autoFocus
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setError(null)
            }}
            aria-invalid={error !== null}
            aria-describedby={error ? 'link-error' : 'link-hint'}
            placeholder="figma.com/file/..."
            className={controlClass}
          />
        </Field>
        <Field label="Jenis" htmlFor="link-kind">
          <select id="link-kind" value={kind} onChange={(e) => setKind(e.target.value as ProjectLinkKind)} className={controlClass}>
            {LINK_KINDS.map((k) => (
              <option key={k} value={k}>
                {LINK_KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Judul" htmlFor="link-title" hint="Kosongkan untuk memakai alamatnya.">
        <input id="link-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Misalnya: Desain halaman utama" className={controlClass} />
      </Field>
      {error ? (
        <p id="link-error" role="alert" className="text-sm font-medium text-status-overdue">
          {error}
        </p>
      ) : (
        <p id="link-hint" className="text-xs text-muted">
          Simpan hanya alamat halamannya. Kata sandi, token, dan alamat yang memuatnya tidak diterima.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Batal</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {initial ? 'Simpan' : 'Tambahkan'}
        </Button>
      </div>
    </form>
  )
}
