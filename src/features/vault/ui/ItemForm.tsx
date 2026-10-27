import { useState, type FormEvent, type ReactNode } from 'react'
import { ArrowsClockwise, Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { Field, controlClass } from '@/components/ui/Field'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { cn } from '@/lib/cn'
import { KIND_LABELS, KIND_ORDER, LIMITS, WIFI_SECURITY, cleanTags, cleanUrls, emptyPayload, validateDraft } from '../lib/payload'
import { useVaultStore } from '../store/vaultStore'
import type { VaultItemKind, VaultItemPayload, WifiSecurity } from '../types'
import { GeneratorPanel } from './GeneratorPanel'
import { StrengthMeter } from './StrengthMeter'
import { useReveal } from './useReveal'

const textareaClass = cn(controlClass, 'h-auto min-h-24 py-2')
const noAssist = { autoComplete: 'off', autoCapitalize: 'off', autoCorrect: 'off', spellCheck: false } as const

function TextInput({ id, value, onChange, ...rest }: { id: string; value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'id'>) {
  return <input id={id} value={value} onChange={(e) => onChange(e.target.value)} {...noAssist} className={controlClass} {...rest} />
}

/** A secret input: masked, with a reveal toggle that hides itself after 10 seconds, and an optional inline generator. */
function SecretInput({ id, label, value, onChange, generator, hint }: { id: string; label: string; value: string; onChange: (value: string) => void; generator?: boolean; hint?: string }) {
  const { revealed, toggle, hide } = useReveal()
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Field label={label} htmlFor={id} hint={hint}>
        <div className="flex items-center gap-1.5">
          <input
            id={id}
            type={revealed ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            {...noAssist}
            autoComplete="new-password"
            className={cn(controlClass, 'font-mono')}
            aria-describedby={generator ? `${id}-strength` : undefined}
          />
          <IconButton icon={revealed ? EyeSlash : Eye} label={revealed ? `Sembunyikan ${label}` : `Tampilkan ${label}`} onClick={toggle} />
          {generator && <IconButton icon={ArrowsClockwise} label="Buat kata sandi acak" aria-expanded={open} onClick={() => setOpen((v) => !v)} />}
        </div>
      </Field>
      {generator && <StrengthMeter id={`${id}-strength`} password={value} />}
      {generator && open && (
        <GeneratorPanel
          onUse={(generated) => {
            onChange(generated)
            hide()
            setOpen(false)
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

const Section = ({ children }: { children: ReactNode }) => <div className="space-y-4">{children}</div>

interface ItemFormProps {
  /** Present when editing. A new item starts empty and lets the person pick the kind. */
  initial?: VaultItemPayload
  id?: string
  startKind?: VaultItemKind
  onCancel: () => void
  onSaved: (id: string) => void
}

export function ItemForm({ initial, id, startKind = 'login', onCancel, onSaved }: ItemFormProps) {
  const saveItem = useVaultStore((s) => s.saveItem)
  const [draft, setDraft] = useState<VaultItemPayload>(() => initial ?? emptyPayload(startKind))
  const [urlsText, setUrlsText] = useState(() => (initial?.kind === 'login' ? initial.urls.join('\n') : ''))
  const [tagsText, setTagsText] = useState(() => (initial && 'tags' in initial ? initial.tags.join(', ') : ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (patch: Record<string, unknown>) => setDraft((current) => ({ ...current, ...patch }) as VaultItemPayload)

  const changeKind = (kind: VaultItemKind) => {
    const title = draft.kind === 'wifi' ? draft.ssid : draft.title
    const next = emptyPayload(kind)
    setDraft(next.kind === 'wifi' ? { ...next, ssid: title } : ({ ...next, title } as VaultItemPayload))
    setUrlsText('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = (draft.kind === 'login'
      ? { ...draft, urls: cleanUrls(urlsText), tags: cleanTags(tagsText) }
      : 'tags' in draft
        ? { ...draft, tags: cleanTags(tagsText) }
        : draft) as VaultItemPayload
    const problem = validateDraft(payload)
    if (problem) return setError(problem)
    setBusy(true)
    setError(null)
    const result = await saveItem(payload, id)
    setBusy(false)
    if (result.ok) return onSaved(result.id)
    setError(
      result.error === 'invalid'
        ? (result.message ?? 'Isian belum valid.')
        : result.error === 'locked'
          ? 'Vault terkunci.'
          : result.error === 'conflict'
            ? 'Vault berubah di tab lain. Muat ulang halaman, lalu coba lagi.'
            : 'Item tidak bisa disimpan.',
    )
  }

  const tagsField = (
    <Field label="Tag" htmlFor="f-tags" hint="Pisahkan dengan koma.">
      <TextInput id="f-tags" value={tagsText} onChange={setTagsText} />
    </Field>
  )

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5" aria-label={id ? 'Ubah item' : 'Item baru'}>
      <h2 className="font-display text-lg font-bold tracking-tight">{id ? 'Ubah item' : 'Item baru'}</h2>

      {!id && (
        <SegmentedControl
          label="Jenis item baru"
          value={draft.kind}
          onChange={changeKind}
          fullWidth
          options={KIND_ORDER.map((kind) => ({ value: kind, label: KIND_LABELS[kind] }))}
        />
      )}

      <Section>
        {draft.kind === 'wifi' ? (
          <Field label="Nama jaringan" htmlFor="f-ssid">
            <TextInput id="f-ssid" value={draft.ssid} maxLength={LIMITS.title} onChange={(ssid) => update({ ssid })} autoFocus />
          </Field>
        ) : (
          <Field label="Judul" htmlFor="f-title">
            <TextInput id="f-title" value={draft.title} maxLength={LIMITS.title} onChange={(title) => update({ title })} autoFocus />
          </Field>
        )}

        {draft.kind === 'login' && (
          <>
            <Field label="Nama pengguna" htmlFor="f-username">
              <TextInput id="f-username" value={draft.username} maxLength={LIMITS.short} onChange={(username) => update({ username })} />
            </Field>
            <SecretInput id="f-password" label="Kata sandi" value={draft.password} generator onChange={(password) => update({ password })} />
            <Field label="Alamat web" htmlFor="f-urls" hint="Satu alamat per baris. Tidak ada ikon situs yang dimuat.">
              <textarea id="f-urls" value={urlsText} onChange={(e) => setUrlsText(e.target.value)} {...noAssist} className={textareaClass} rows={2} />
            </Field>
          </>
        )}

        {draft.kind === 'apiKey' && (
          <>
            <Field label="Layanan" htmlFor="f-service">
              <TextInput id="f-service" value={draft.service} maxLength={LIMITS.short} onChange={(service) => update({ service })} />
            </Field>
            <SecretInput id="f-key" label="Kunci API" value={draft.key} onChange={(key) => update({ key })} />
            <Field label="Kedaluwarsa (opsional)" htmlFor="f-expires">
              <TextInput id="f-expires" type="date" value={draft.expiresAt ?? ''} onChange={(expiresAt) => update({ expiresAt: expiresAt || undefined })} className={cn(controlClass, 'max-w-48')} />
            </Field>
          </>
        )}

        {draft.kind === 'secureNote' && (
          <Field label="Isi catatan" htmlFor="f-body" hint="Teks biasa. Disamarkan di layar sampai kamu menampilkannya.">
            <textarea id="f-body" value={draft.body} onChange={(e) => update({ body: e.target.value })} {...noAssist} className={cn(textareaClass, 'min-h-48')} rows={8} />
          </Field>
        )}

        {draft.kind === 'wifi' && (
          <>
            <Field label="Keamanan" htmlFor="f-security">
              <select id="f-security" value={draft.security} onChange={(e) => update({ security: e.target.value as WifiSecurity })} className={cn(controlClass, 'max-w-64')}>
                {WIFI_SECURITY.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {draft.security !== 'open' && <SecretInput id="f-wifi-password" label="Kata sandi" value={draft.password} generator onChange={(password) => update({ password })} />}
          </>
        )}

        {draft.kind !== 'secureNote' && (
          <Field label="Catatan" htmlFor="f-notes" hint="Catatan tampil apa adanya di layar. Simpan rahasia di kolom sandi atau kunci, atau di Catatan aman.">
            <textarea id="f-notes" value={draft.notes} onChange={(e) => update({ notes: e.target.value })} {...noAssist} className={textareaClass} rows={3} />
          </Field>
        )}

        {draft.kind !== 'wifi' && tagsField}
      </Section>

      {error && (
        <p role="alert" className="text-sm text-status-overdue">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Menyimpan…' : 'Simpan'}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Batal
        </Button>
      </div>
    </form>
  )
}
