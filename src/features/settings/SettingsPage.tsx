import { Page } from '@/components/layout/Page'
import { PageHero } from '@/components/ui/PageHero'
import { AccountCard } from './AccountCard'
import { ImportLocalCard } from './ImportLocalCard'
import { JournalPrivacyCard } from './JournalPrivacyCard'

export default function SettingsPage() {
  return (
    <Page>
      <PageHero title="Settings" description="Tema sudah bisa diganti dari bilah atas. Kota dan profil menyusul." art="grain" band="bottom" flip />
      <div className="max-w-2xl space-y-4">
        <AccountCard />
        <ImportLocalCard />
        <JournalPrivacyCard />
      </div>
    </Page>
  )
}
