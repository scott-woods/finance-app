import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2 } from 'lucide-react'
import { currency } from '@/lib/format'
import { AddRecordForm } from '../../_components/add-record-form'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']

export function SnapshotRow({
  snapshot,
  previous,
  account,
  onSaved,
  onDelete,
}: {
  snapshot: AccountSnapshot
  previous?: AccountSnapshot
  account: Account
  onSaved: () => void
  onDelete: () => void
}) {
  const rowChange = previous ? snapshot.balance - previous.balance : null

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-text-primary text-base">
        {new Date(snapshot.as_of_date).toLocaleDateString()}
      </p>
      <div className="flex items-center gap-4">
        <p className="text-text-primary text-lg font-semibold">{currency(snapshot.balance)}</p>
        {rowChange != null && (
          <Badge
            variant="outline"
            className={`text-sm border-transparent rounded-full ${
              rowChange >= 0 ? 'text-positive bg-positive/10' : 'text-negative bg-negative/10'
            }`}
          >
            {rowChange >= 0 ? '+' : ''}{currency(rowChange)}
          </Badge>
        )}
        <AddRecordForm
          mode="edit"
          accountId={account.id}
          accountName={account.name}
          snapshot={snapshot}
          onSaved={onSaved}
        />
        <Button variant="ghost" size="icon" className="text-text-muted hover:text-negative" onClick={onDelete}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}