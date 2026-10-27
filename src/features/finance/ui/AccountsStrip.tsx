import { Wallet } from '@phosphor-icons/react'
import type { AccountBalance, NetBalance } from '@/lib/financeSelectors'
import { ACCOUNT_KIND_LABEL } from '../labels'
import { Amount } from './Amount'

interface AccountsStripProps {
  balances: AccountBalance[]
  net: NetBalance
}

/** The net balance first, then one small card per account that is not archived. */
export function AccountsStrip({ balances, net }: AccountsStripProps) {
  const live = balances.filter((b) => !b.account.archivedAt).sort((a, b) => a.account.order - b.account.order)
  return (
    <section aria-label="Akun" className="space-y-3">
      <div className="rounded-card border bg-surface p-4">
        <p className="text-sm text-muted">Saldo bersih</p>
        <p className="mt-1 text-xl font-bold tracking-tight">
          <Amount minor={net.totalMinor} />
        </p>
        {net.approximate && <p className="mt-1 text-xs text-muted">Perkiraan: akun mata uang asing dihitung dengan kurs terakhir yang dipakai.</p>}
        {net.missingRates.length > 0 && (
          <p className="mt-1 text-xs text-muted">Akun {net.missingRates.join(', ')} belum punya kurs, jadi belum masuk hitungan.</p>
        )}
      </div>
      {live.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Wallet aria-hidden /> Belum ada akun.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {live.map(({ account, balanceMinor }) => (
            <li key={account.id} className="rounded-card border bg-surface p-3">
              <p className="truncate text-sm font-medium">{account.name}</p>
              <p className="text-xs text-muted">{ACCOUNT_KIND_LABEL[account.kind]}</p>
              <p className="mt-2 text-base font-semibold">
                <Amount minor={balanceMinor} currency={account.currency} className="block text-right" />
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
