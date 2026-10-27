import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lightbulb, Plus } from '@phosphor-icons/react'
import { Page } from '@/components/layout/Page'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StoreGate } from '@/components/ui/StoreGate'
import { useKeyHotkey } from '@/lib/hotkeys'
import { useProjectStore } from '@/stores/entities'
import type { BrainstormSession } from '@/types/domain'
import { ActionStage } from './ActionStage'
import { BrainstormSkeleton } from './BrainstormSkeleton'
import { CaptureStage } from './CaptureStage'
import { ClusterStage } from './ClusterStage'
import { PrioritizeStage } from './PrioritizeStage'
import { SessionDialog } from './SessionDialog'
import { SessionHeader } from './SessionHeader'
import { SessionRail } from './SessionRail'
import { sortSessions } from './lib/sessions'
import { loadBrainstorm, useBrainstormStore } from './store/brainstormStore'

type Stage = 'tangkap' | 'kelompokkan' | 'pilih' | 'aksi'

const STAGES: Array<{ value: Stage; label: string }> = [
  { value: 'tangkap', label: 'Tangkap' },
  { value: 'kelompokkan', label: 'Kelompokkan' },
  { value: 'pilih', label: 'Pilih' },
  { value: 'aksi', label: 'Aksi' },
]
const isStage = (value: string | null): value is Stage => STAGES.some((s) => s.value === value)

/** A stable array, as StoreGate requires. */
const STORES = [useBrainstormStore, useProjectStore]

/** /brainstorm: capture ideas, sort them into clusters, then turn the good ones into tasks, notes or projects. */
export default function BrainstormPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const projects = useProjectStore((s) => s.items)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    void loadBrainstorm()
  }, [])

  const onCreated = (session: BrainstormSession) => {
    const next = new URLSearchParams(params)
    next.set('sesi', session.id)
    next.set('tahap', 'tangkap')
    next.delete('arsip')
    setParams(next, { replace: true })
  }

  return (
    <Page>
      <PageHeader
        title="Brainstorm"
        description="Tangkap ide tanpa menyaring, kelompokkan, lalu jadikan aksi."
        actions={
          <Button variant="primary" onClick={() => setDialogOpen(true)}>
            <Plus weight="bold" aria-hidden />
            Sesi baru
          </Button>
        }
      />
      <StoreGate stores={STORES} skeleton={<BrainstormSkeleton />}>
        <Workspace shortcutsOn={!dialogOpen} onNew={() => setDialogOpen(true)} />
      </StoreGate>
      <SessionDialog open={dialogOpen} projects={projects} onClose={() => setDialogOpen(false)} onCreated={onCreated} />
    </Page>
  )
}

function Workspace({ shortcutsOn, onNew }: { shortcutsOn: boolean; onNew: () => void }) {
  const [params, setParams] = useSearchParams()
  const sessions = useBrainstormStore((s) => s.items)
  const projects = useProjectStore((s) => s.items)
  const [focusSignal, setFocusSignal] = useState(0)

  const archivedView = params.get('arsip') === '1'
  const requestedStage = params.get('tahap')
  const stage: Stage = isStage(requestedStage) ? requestedStage : 'tangkap'

  const visible = useMemo(() => sortSessions(sessions.filter((s) => Boolean(s.archivedAt) === archivedView)), [sessions, archivedView])
  const archivedCount = useMemo(() => sessions.filter((s) => s.archivedAt).length, [sessions])
  const selected = visible.find((s) => s.id === params.get('sesi')) ?? visible[0]

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) next.delete(key)
        else next.set(key, value)
      }
      setParams(next, { replace: true })
    },
    [params, setParams],
  )
  const setStage = useCallback((value: Stage) => update({ tahap: value }), [update])

  const enabled = shortcutsOn && Boolean(selected)
  const newIdea = useCallback(() => {
    setStage('tangkap')
    setFocusSignal((n) => n + 1)
  }, [setStage])
  const toCapture = useCallback(() => setStage('tangkap'), [setStage])
  const toCluster = useCallback(() => setStage('kelompokkan'), [setStage])
  const toPrioritize = useCallback(() => setStage('pilih'), [setStage])
  const toAction = useCallback(() => setStage('aksi'), [setStage])
  useKeyHotkey({ key: 'n' }, newIdea, enabled)
  useKeyHotkey({ key: '1' }, toCapture, enabled)
  useKeyHotkey({ key: '2' }, toCluster, enabled)
  useKeyHotkey({ key: '3' }, toPrioritize, enabled)
  useKeyHotkey({ key: '4' }, toAction, enabled)

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <SessionRail
        sessions={visible}
        selectedId={selected?.id}
        archived={archivedView}
        archivedCount={archivedCount}
        onSelect={(id) => update({ sesi: id })}
        onToggleArchived={(archived) => update({ arsip: archived ? '1' : null, sesi: null })}
      />
      {selected ? (
        <div className="min-w-0 space-y-4">
          <SessionHeader key={selected.id} session={selected} projects={projects} />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <SegmentedControl<Stage> label="Tahap brainstorm" value={stage} onChange={setStage} options={STAGES} />
            <p className="hidden text-xs text-muted md:block">Pintasan: N ide baru, 1 2 3 4 pindah tahap</p>
          </div>
          {stage === 'tangkap' && <CaptureStage session={selected} focusSignal={focusSignal} />}
          {stage === 'kelompokkan' && <ClusterStage session={selected} onGoCapture={toCapture} />}
          {stage === 'pilih' && <PrioritizeStage session={selected} onGoCapture={toCapture} />}
          {stage === 'aksi' && <ActionStage session={selected} onGoCapture={toCapture} />}
        </div>
      ) : (
        <EmptyState
          icon={Lightbulb}
          title={archivedView ? 'Tidak ada sesi di arsip' : 'Belum ada sesi'}
          description={archivedView ? 'Sesi yang diarsipkan muncul di sini dan bisa dipulihkan.' : 'Buat sesi untuk satu pertanyaan atau topik.'}
          action={archivedView ? undefined : <Button variant="primary" onClick={onNew}>Sesi baru</Button>}
        />
      )}
    </div>
  )
}
