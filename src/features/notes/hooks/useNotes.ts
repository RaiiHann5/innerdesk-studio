import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { noteRepo } from '@/data/repos'
import { useNoteStore } from '@/stores/entities'
import { useUiStore } from '@/stores/ui'
import type { Note, NoteContent } from '@/types/domain'
import { arrangeNotes, collectTags, countByTab } from '../lib/arrange'
import { applyTemplate, type TemplateSource } from '../lib/templates'
import { useNoteFilters } from '../store'

const EMPTY_CONTENT: NoteContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/** Ids of the notes matching the query, asked of the repo so a remote database can do the matching. */
function useSearchMatches(query: string) {
  const term = query.trim()
  const [result, setResult] = useState<{ term: string; ids: Set<string> } | null>(null)

  useEffect(() => {
    if (!term) return
    let stale = false
    noteRepo
      .search(term)
      .then((found) => !stale && setResult({ term, ids: new Set(found.map((n) => n.id)) }))
      .catch(() => useUiStore.getState().showToast('Pencarian catatan gagal.'))
    return () => {
      stale = true
    }
  }, [term])

  if (!term) return { matchIds: null, pending: false }
  // Until the answer for the current term arrives, the previous answer stays on screen.
  return { matchIds: result?.ids ?? null, pending: result?.term !== term }
}

/**
 * Creates an empty note and opens it in the editor. Shared by the page header, the empty states, the N shortcut
 * and a project's Catatan tab, which passes the project so the note starts out belonging to it.
 */
export function useCreateNote() {
  const navigate = useNavigate()
  const [creating, setCreating] = useState(false)
  const busy = useRef(false)

  const make = useCallback(
    async (start: Partial<Pick<Note, 'title' | 'content' | 'excerpt' | 'tags'>>, projectId?: unknown) => {
      if (busy.current) return
      busy.current = true
      setCreating(true)
      try {
        const note = await useNoteStore.getState().add({
          title: start.title ?? '',
          content: start.content ?? EMPTY_CONTENT,
          excerpt: start.excerpt ?? '',
          tags: start.tags ?? [],
          pinned: false,
          // Handlers sometimes pass a click event as the first argument; only a string is a project id.
          projectId: typeof projectId === 'string' ? projectId : undefined,
        })
        navigate(`/notes/${note.id}`)
      } catch (e) {
        useUiStore.getState().showToast(e instanceof Error ? e.message : 'Catatan gagal dibuat.')
      } finally {
        busy.current = false
        setCreating(false)
      }
    },
    [navigate],
  )

  const create = useCallback((projectId?: string) => make({}, projectId), [make])
  /** A note that starts from a template: its title, body and tags, with today's date filled in. */
  const createFromTemplate = useCallback((source: TemplateSource, projectId?: string) => make(applyTemplate(source), projectId), [make])

  return { creating, create, createFromTemplate }
}

/** Everything the notes grid needs: the notes on the current tab, the tab counts, and the tags in use. */
export function useNotes() {
  const notes = useNoteStore((s) => s.items)
  const query = useNoteFilters((s) => s.query)
  const tag = useNoteFilters((s) => s.tag)
  const sort = useNoteFilters((s) => s.sort)
  const tab = useNoteFilters((s) => s.tab)

  const tags = useMemo(() => collectTags(notes, tab), [notes, tab])
  // A tag that nothing on this tab uses would leave the grid empty with no visible reason.
  const activeTag = tag && tags.includes(tag) ? tag : null
  const { matchIds, pending } = useSearchMatches(query)
  const visible = useMemo(() => {
    const { pinned, rest } = arrangeNotes(notes, { tab, tag: activeTag, sort, matchIds })
    return [...pinned, ...rest]
  }, [notes, tab, activeTag, sort, matchIds])
  const counts = useMemo(() => countByTab(notes, { tag: activeTag, matchIds }), [notes, activeTag, matchIds])

  return { hasAny: notes.length > 0, tab, tags, activeTag, visible, counts, pending }
}
