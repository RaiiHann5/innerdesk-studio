import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Page } from '@/components/layout/Page'
import { ErrorState } from '@/components/ui/ErrorState'
import { PageHeader } from '@/components/ui/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { useVaultStore } from './store/vaultStore'
import { BlurShield } from './ui/BlurShield'
import { LockedView } from './ui/LockedView'
import { RestoreBackupForm } from './ui/RestoreBackupForm'
import { SetupFlow } from './ui/SetupFlow'
import { UnlockedView } from './ui/UnlockedView'
import { VaultSettings } from './ui/VaultSettings'

/** WebCrypto only exists on secure origins (HTTPS or localhost). Without it nothing here can work. */
const cryptoAvailable = () => typeof globalThis.crypto?.subtle !== 'undefined' && window.isSecureContext !== false

export default function VaultPage() {
  const status = useVaultStore((s) => s.status)
  const init = useVaultStore((s) => s.init)
  const { pathname } = useLocation()

  useEffect(() => {
    void init()
  }, [init])

  if (!cryptoAvailable()) {
    return (
      <Page>
        <PageHeader title="Vault" description="Kata sandi, kunci API, dan catatan rahasia, dienkripsi di perangkat ini." />
        <ErrorState
          title="Vault butuh koneksi aman"
          message="Fitur enkripsi peramban hanya tersedia lewat HTTPS atau localhost. Buka aplikasi ini lewat alamat yang aman."
        />
      </Page>
    )
  }

  return (
    <Page>
      <BlurShield>
        {status !== 'unlocked' && (
          <PageHeader title="Vault" description="Kata sandi, kunci API, dan catatan rahasia, dienkripsi di perangkat ini." />
        )}
        {status === 'loading' && <Skeleton className="mx-auto h-56 w-full max-w-md" />}
        {status === 'error' && (
          <div className="mx-auto max-w-md space-y-5">
            <ErrorState
              title="Vault tidak bisa dibuka"
              message="Data vault di perangkat ini tidak bisa dibaca. Tidak ada yang diubah atau dihapus. Muat ulang halaman; kalau tetap gagal, pulihkan dari backup terenkripsi di bawah."
              onRetry={() => void init()}
            />
            <section aria-labelledby="error-restore-title" className="rounded-card border bg-surface p-5">
              <h2 id="error-restore-title" className="mb-4 font-display text-md font-bold tracking-tight">
                Pulihkan dari backup
              </h2>
              <RestoreBackupForm replacing={false} />
            </section>
          </div>
        )}
        {status === 'needs-setup' && <SetupFlow />}
        {status === 'locked' && <LockedView />}
        {status === 'unlocked' && (pathname === '/vault/pengaturan' ? <VaultSettings /> : <UnlockedView />)}
      </BlurShield>
    </Page>
  )
}
