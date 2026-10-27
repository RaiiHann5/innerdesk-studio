import { useCallback, useEffect, useState } from 'react'
import { ArrowsClockwise, Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/Button'
import { IconButton } from '@/components/ui/IconButton'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import {
  DEFAULT_PASSPHRASE_OPTIONS,
  DEFAULT_PASSWORD_OPTIONS,
  LENGTH_MAX,
  LENGTH_MIN,
  SEPARATORS,
  WORDS_MAX,
  WORDS_MIN,
  canGeneratePassword,
  generatePassphrase,
  generatePassword,
  type Generated,
  type PassphraseOptions,
  type PasswordOptions,
} from '../lib/generator'
import { useReveal } from './useReveal'

type Mode = 'chars' | 'phrase'
const rangeClass = 'h-5 w-full cursor-pointer accent-[rgb(var(--accent))]'
const separatorLabel = (s: string) => (s === ' ' ? 'spasi' : s)

/** Inline generator for a password field. The generated value stays masked until revealed, like any other secret. */
export function GeneratorPanel({ onUse, onClose }: { onUse: (value: string) => void; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('chars')
  const [chars, setChars] = useState<PasswordOptions>(DEFAULT_PASSWORD_OPTIONS)
  const [phrase, setPhrase] = useState<PassphraseOptions>(DEFAULT_PASSPHRASE_OPTIONS)
  const [result, setResult] = useState<Generated>(() => generatePassword(DEFAULT_PASSWORD_OPTIONS))
  const { revealed, toggle, hide } = useReveal()

  const regenerate = useCallback(() => {
    setResult(mode === 'chars' ? generatePassword(chars) : generatePassphrase(phrase))
    hide()
  }, [mode, chars, phrase, hide])

  // A new value whenever an option changes, never one that no longer matches what the controls say.
  useEffect(() => {
    regenerate()
  }, [regenerate])

  const toggleClass = (key: 'lower' | 'upper' | 'digits' | 'symbols') => {
    const next = { ...chars, [key]: !chars[key] }
    if (canGeneratePassword(next)) setChars(next)
  }

  const classRows: Array<[keyof PasswordOptions & ('lower' | 'upper' | 'digits' | 'symbols'), string]> = [
    ['lower', 'Huruf kecil'],
    ['upper', 'Huruf besar'],
    ['digits', 'Angka'],
    ['symbols', 'Simbol'],
  ]

  return (
    <div className="mt-2 space-y-4 rounded-control border bg-sunken p-3" role="group" aria-label="Pembuat kata sandi">
      <SegmentedControl
        label="Jenis"
        value={mode}
        onChange={setMode}
        options={[
          { value: 'chars', label: 'Karakter acak' },
          { value: 'phrase', label: 'Frasa sandi' },
        ]}
      />

      {mode === 'chars' ? (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="gen-length" className="font-medium">
                Panjang
              </label>
              <output htmlFor="gen-length" className="tabular-nums">
                {chars.length}
              </output>
            </div>
            <input id="gen-length" type="range" min={LENGTH_MIN} max={LENGTH_MAX} value={chars.length} onChange={(e) => setChars({ ...chars, length: Number(e.target.value) })} className={rangeClass} />
          </div>
          {classRows.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <span id={`gen-${key}`} className="text-sm">
                {label}
              </span>
              <Switch checked={chars[key]} onChange={() => toggleClass(key)} labelledBy={`gen-${key}`} />
            </div>
          ))}
          <div className="flex items-center justify-between gap-3">
            <span id="gen-lookalike" className="text-sm">
              Hindari karakter mirip (l, 1, I, O, 0)
            </span>
            <Switch checked={chars.excludeLookalikes} onChange={(on) => setChars({ ...chars, excludeLookalikes: on })} labelledBy="gen-lookalike" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between text-sm">
              <label htmlFor="gen-words" className="font-medium">
                Jumlah kata
              </label>
              <output htmlFor="gen-words" className="tabular-nums">
                {phrase.words}
              </output>
            </div>
            <input id="gen-words" type="range" min={WORDS_MIN} max={WORDS_MAX} value={phrase.words} onChange={(e) => setPhrase({ ...phrase, words: Number(e.target.value) })} className={rangeClass} />
          </div>
          <SegmentedControl
            label="Pemisah"
            value={phrase.separator}
            onChange={(separator) => setPhrase({ ...phrase, separator })}
            options={SEPARATORS.map((s) => ({ value: s, label: separatorLabel(s) }))}
          />
        </div>
      )}

      <div className="flex items-center gap-2 rounded-control border bg-surface px-3 py-2">
        <p className="min-w-0 flex-1 break-all font-mono text-base">
          {revealed ? result.value : <span aria-hidden>••••••••••••</span>}
          {!revealed && <span className="sr-only">Disembunyikan</span>}
        </p>
        <IconButton icon={revealed ? EyeSlash : Eye} label={revealed ? 'Sembunyikan hasil' : 'Tampilkan hasil'} onClick={toggle} />
        <IconButton icon={ArrowsClockwise} label="Buat ulang" onClick={regenerate} />
      </div>
      <p className="text-xs tabular-nums text-muted">
        Entropi ≈ {result.entropyBits} bit. Dibuat di perangkat ini dengan generator acak peramban.
        {mode === 'phrase' && ' Daftar katanya kecil, jadi pakai 6 kata atau lebih.'}
      </p>

      <div className="flex gap-2">
        <Button variant="primary" onClick={() => onUse(result.value)}>
          Pakai
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Tutup
        </Button>
      </div>
    </div>
  )
}
