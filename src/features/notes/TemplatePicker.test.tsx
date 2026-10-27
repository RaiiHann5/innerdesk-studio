// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_PREFIX } from '@/lib/config'
import { useNoteStore, useNoteTemplateStore, useProjectStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { NoteContent, NoteTemplate } from '@/types/domain'
import { stubBrowser } from '../projects/testSetup'
import { SaveTemplateDialog } from './SaveTemplateDialog'
import { BUILTIN_TEMPLATES } from './lib/templates'
import NotesPage from './NotesPage'
import { TemplatePicker } from './TemplatePicker'

const content: NoteContent = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Tujuan' }] }, { type: 'paragraph' }] }

const saved = (overrides: Partial<NoteTemplate> = {}): NoteTemplate => ({
  id: 'ntpl-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  name: 'Rapat tim',
  description: 'Untuk Senin pagi',
  title: 'Rapat tim {{tanggal}}',
  content,
  tags: ['tim'],
  ...overrides,
})

async function loadStores(templates: NoteTemplate[] = []) {
  localStorage.setItem(STORAGE_PREFIX + 'note-templates', JSON.stringify(templates))
  localStorage.setItem(STORAGE_PREFIX + 'notes-v2', JSON.stringify([]))
  localStorage.setItem(STORAGE_PREFIX + 'projects', JSON.stringify([]))
  await Promise.all([useNoteTemplateStore.getState().load(), useNoteStore.getState().load(), useProjectStore.getState().load()])
}

const storedTemplates = () => JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'note-templates') ?? '[]') as NoteTemplate[]

beforeEach(() => {
  stubBrowser()
  useUiStore.setState({ toast: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('TemplatePicker', () => {
  it('lists the built-in templates and hands back the one that was pressed', async () => {
    await loadStores()
    const onPick = vi.fn()
    render(<TemplatePicker open onClose={() => {}} onPick={onPick} />)
    const dialog = screen.getByRole('dialog', { name: 'Mulai dari template' })
    for (const t of BUILTIN_TEMPLATES) expect(within(dialog).getByText(t.name)).toBeTruthy()

    fireEvent.click(within(dialog).getByRole('button', { name: /Catatan rapat/ }))
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(onPick.mock.calls[0][0].id).toBe('builtin-rapat')
  })

  it('shows what each template asks you to fill in', async () => {
    await loadStores()
    render(<TemplatePicker open onClose={() => {}} onPick={() => {}} />)
    expect(screen.getByText('Peserta · Agenda · Keputusan · Tindak lanjut')).toBeTruthy()
  })

  it('explains where saved templates come from while there are none', async () => {
    await loadStores()
    render(<TemplatePicker open onClose={() => {}} onPick={() => {}} />)
    expect(screen.getByText(/Jadikan template/)).toBeTruthy()
  })

  it('lists the ones the person saved, and deleting one can be undone', async () => {
    await loadStores([saved()])
    render(<TemplatePicker open onClose={() => {}} onPick={() => {}} />)
    expect(screen.getByText('Rapat tim')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Hapus template Rapat tim' }))
    await waitFor(() => expect(storedTemplates()).toEqual([]))
    expect(screen.queryByText('Rapat tim')).toBeNull()

    useUiStore.getState().toast!.action!.run()
    await waitFor(() => expect(storedTemplates().map((t) => t.id)).toEqual(['ntpl-1']))
    expect(await screen.findByText('Rapat tim')).toBeTruthy()
  })

  it('does not hand back a second template while a note is being created', async () => {
    await loadStores()
    const onPick = vi.fn()
    render(<TemplatePicker open busy onClose={() => {}} onPick={onPick} />)
    fireEvent.click(screen.getByRole('button', { name: /Catatan rapat/ }))
    expect(onPick).not.toHaveBeenCalled()
  })
})

describe('SaveTemplateDialog', () => {
  const note = { title: 'Rapat mingguan', content, tags: ['tim'] }

  it('starts with the note title as the name and saves title, content and tags', async () => {
    await loadStores()
    const onClose = vi.fn()
    render(<SaveTemplateDialog open note={note} onClose={onClose} />)
    const name = screen.getByLabelText('Nama template') as HTMLInputElement
    expect(name.value).toBe('Rapat mingguan')

    fireEvent.change(screen.getByLabelText('Deskripsi'), { target: { value: 'Setiap Senin' } })
    fireEvent.click(screen.getByRole('button', { name: 'Simpan template' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(storedTemplates()).toMatchObject([{ name: 'Rapat mingguan', description: 'Setiap Senin', title: 'Rapat mingguan', tags: ['tim'], content }])
  })

  it('needs a name', async () => {
    await loadStores()
    render(<SaveTemplateDialog open note={{ ...note, title: '' }} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Simpan template' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nama template wajib diisi.')
    expect(storedTemplates()).toEqual([])
  })
})

describe('creating a note from a template', () => {
  function mountNotes() {
    return render(
      <MemoryRouter initialEntries={['/notes']}>
        <Routes>
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/notes/:noteId" element={<p>editor terbuka</p>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('opens the new note with the template filled in and today’s date in the title', async () => {
    await loadStores()
    mountNotes()
    fireEvent.click(await screen.findByRole('button', { name: /Dari template/ }))
    fireEvent.click(await screen.findByRole('button', { name: /Catatan rapat/ }))

    await screen.findByText('editor terbuka')
    const [note] = useNoteStore.getState().items
    expect(note.title).toMatch(/^Rapat \w+, \d{1,2} \w+ 20\d\d$/)
    expect(note.title).not.toContain('{{')
    expect(note.tags).toEqual(['rapat'])
    expect(note.pinned).toBe(false)
    expect(note.excerpt).toContain('Peserta')
    expect(note.content.content.some((n) => n.type === 'taskList')).toBe(true)
  })

  it('starts from a saved template too', async () => {
    await loadStores([saved()])
    mountNotes()
    fireEvent.click(await screen.findByRole('button', { name: /Dari template/ }))
    fireEvent.click(await screen.findByRole('button', { name: /^Rapat tim/ }))
    await screen.findByText('editor terbuka')
    expect(useNoteStore.getState().items[0]).toMatchObject({ tags: ['tim'] })
    expect(useNoteStore.getState().items[0].title).toMatch(/^Rapat tim \w+,/)
  })

  it('leaves the plain “Catatan baru” button making an empty note', async () => {
    await loadStores()
    mountNotes()
    fireEvent.click((await screen.findAllByRole('button', { name: /Catatan baru/ }))[0])
    await screen.findByText('editor terbuka')
    expect(useNoteStore.getState().items[0]).toMatchObject({ title: '', tags: [], excerpt: '' })
  })
})
