import { cn } from '@/lib/cn'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { useSettingsStore } from '@/stores/settings'
import { FONT_OPTIONS, SIZE_OPTIONS, SPACING_OPTIONS, type DocSize } from '../lib/viewPrefs'
import { PanelSection } from './PanelSection'

/** Font, size and line spacing of the paper. They are settings of the app, so every note follows them. */
export function AppearanceSection() {
  const font = useSettingsStore((s) => s.noteFont)
  const size = useSettingsStore((s) => s.noteSize)
  const spacing = useSettingsStore((s) => s.noteSpacing)
  const { setNoteFont, setNoteSize, setNoteSpacing } = useSettingsStore.getState()

  return (
    <>
      <PanelSection title="Font">
        <div role="radiogroup" aria-label="Font dokumen" className="grid grid-cols-3 gap-2">
          {FONT_OPTIONS.map((option) => {
            const selected = option.value === font
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setNoteFont(option.value)}
                className={cn(
                  'flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-control border transition-colors duration-fast',
                  selected ? 'border-transparent bg-accent-soft text-accent-text' : 'bg-surface text-ink hover:border-faint',
                )}
              >
                <span aria-hidden style={{ fontFamily: option.stack }} className="text-lg leading-none">
                  Aa
                </span>
                <span className="max-w-full truncate px-1 text-xs">{option.label}</span>
              </button>
            )
          })}
        </div>
      </PanelSection>

      <PanelSection title="Ukuran">
        <SegmentedControl<`${DocSize}`>
          label="Ukuran teks"
          fullWidth
          options={SIZE_OPTIONS.map((o) => ({ value: `${o.value}` as `${DocSize}`, label: o.label }))}
          value={`${size}`}
          onChange={(value) => setNoteSize(Number(value) as DocSize)}
        />
      </PanelSection>

      <PanelSection title="Jarak baris">
        <SegmentedControl label="Jarak baris" fullWidth options={SPACING_OPTIONS} value={spacing} onChange={setNoteSpacing} />
      </PanelSection>
    </>
  )
}
