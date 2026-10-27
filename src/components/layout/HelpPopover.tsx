import { Question } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Popover } from '@/components/ui/Popover'
import { modKey } from '@/lib/hotkeys'

const Kbd = ({ children }: { children: string }) => (
  <kbd className="rounded-control border bg-sunken px-1.5 py-0.5 text-xs font-medium text-muted">{children}</kbd>
)

export function HelpPopover() {
  return (
    <Popover
      label="Bantuan"
      renderTrigger={({ ref, ...props }) => <IconButton ref={ref} icon={Question} label="Bantuan" {...props} />}
    >
      <div className="space-y-4 p-4 text-sm">
        <h2 className="text-md font-bold">Pintasan dan catat cepat</h2>
        <dl className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Buka pencarian dan catat cepat</dt>
            <dd className="flex gap-1">
              <Kbd>{modKey}</Kbd>
              <Kbd>K</Kbd>
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted">Tutup dialog atau panel</dt>
            <dd>
              <Kbd>Esc</Kbd>
            </dd>
          </div>
        </dl>
        <div className="space-y-1 border-t pt-3">
          <p className="font-medium">Contoh catat cepat</p>
          <p className="rounded-control bg-sunken px-2 py-1.5 text-muted">Kirim invoice !tinggi #batik besok</p>
          <p className="text-xs text-muted">
            Prioritas dengan !mendesak, !tinggi, !sedang, !rendah. Project dengan #awalan-nama. Tenggat dengan hari ini,
            besok, lusa, atau nama hari.
          </p>
        </div>
      </div>
    </Popover>
  )
}
