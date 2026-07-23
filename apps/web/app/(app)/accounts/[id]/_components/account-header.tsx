import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import { currency } from '@/lib/format'
import { AddRecordForm } from '../../_components/add-record-form'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']

export function AccountHeader({
  account,
  snapshots,
  onSaved,
}: {
  account: Account
  snapshots: AccountSnapshot[]
  onSaved: () => void
}) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type]
  const amountColor = account.is_asset ? 'text-positive' : 'text-negative'
  const latest = snapshots[0]
  const previous = snapshots[1]
  const change = latest && previous ? latest.balance - previous.balance : null
  const changePct = change != null && previous.balance !== 0 ? (change / previous.balance) * 100 : null

  return (
    <Card className="p-6">
      <CardContent className="p-0 flex flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-accent/15 text-accent rounded-full p-3.5">
            <Icon size={26} />
          </div>
          <div>
            <p className="text-text-muted text-base">{ACCOUNT_TYPE_LABELS[account.type]}</p>
            <h1 className="font-display text-3xl text-text-primary">{account.name}</h1>
            {latest && (
              <p className="text-text-muted text-base mt-1">
                Last updated {new Date(latest.as_of_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <p className={`font-display text-4xl ${amountColor}`}>
            {latest ? currency(latest.balance) : '—'}
          </p>
          {changePct != null && (
            <Badge
              variant="outline"
              className={`text-sm border-transparent rounded-full ${
                change! >= 0 ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'
              }`}
            >
              {change! >= 0 ? '↗' : '↘'} {changePct.toFixed(1)}% from previous
            </Badge>
          )}
          <AddRecordForm
            trigger="button"
            accountId={account.id}
            accountName={account.name}
            onSaved={onSaved}
          />
        </div>
      </CardContent>
    </Card>
  )
}