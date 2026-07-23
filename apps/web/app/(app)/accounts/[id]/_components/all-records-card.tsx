import { Card, CardContent } from '@/components/ui/card'
import { ListOrdered } from 'lucide-react'
import { CardSectionHeader } from '@/components/card-section-header'
import { SnapshotRow } from './snapshot-row'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']

export function AllRecordsCard({
  account,
  snapshots,
  onSaved,
  onDeleteSnapshot,
}: {
  account: Account
  snapshots: AccountSnapshot[]
  onSaved: () => void
  onDeleteSnapshot: (id: number) => void
}) {
  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <CardSectionHeader icon={ListOrdered} title="All Records" />
        <div className="flex flex-col divide-y divide-border">
          {snapshots.map((snap, i) => (
            <SnapshotRow
              key={snap.id}
              snapshot={snap}
              previous={snapshots[i + 1]}
              account={account}
              onSaved={onSaved}
              onDelete={() => onDeleteSnapshot(snap.id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}