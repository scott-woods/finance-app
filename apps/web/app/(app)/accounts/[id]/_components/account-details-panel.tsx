import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import { SlidersHorizontal, CircleCheck, History, ListOrdered, Lock, EyeOff, Trash2 } from 'lucide-react'
import { AccountForm } from '../../_components/account-form'
import { CardSectionHeader } from '@/components/card-section-header'
import type { AccountType } from '@/types/accounts'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']

export function AccountDetailsPanel({
  account,
  snapshots,
  onSaved,
  onChangeStatus,
  onDeleteAccount,
  allowedTypes,
}: {
  account: Account
  snapshots: AccountSnapshot[]
  onSaved: () => void
  onChangeStatus: (status: 'active' | 'closed' | 'hidden') => void
  onDeleteAccount: () => void
  allowedTypes: AccountType[]
}) {
  const historySpanDays =
    snapshots.length > 1
      ? Math.round(
          (new Date(snapshots[0].as_of_date).getTime() -
            new Date(snapshots[snapshots.length - 1].as_of_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  const earliestDate = snapshots.length > 0 ? snapshots[snapshots.length - 1].as_of_date : null

  return (
    <Card className="p-6 flex flex-col">
      <CardContent className="p-0 flex flex-col justify-between h-full">
        <div>
          <CardSectionHeader icon={SlidersHorizontal} title="Details & Actions" />

          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CircleCheck size={16} className="text-text-muted" />
                <span className="text-sm uppercase tracking-wide text-text-muted">Status</span>
              </div>
              <p className="text-xl font-medium text-text-primary capitalize">
                {account.status ?? 'active'}
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <History size={16} className="text-text-muted" />
                <span className="text-sm uppercase tracking-wide text-text-muted">History span</span>
              </div>
              <p className="text-xl font-medium text-text-primary">{historySpanDays} days</p>
              {earliestDate && (
                <p className="text-sm text-text-muted">
                  Since {new Date(earliestDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <ListOrdered size={16} className="text-text-muted" />
                <span className="text-sm uppercase tracking-wide text-text-muted">Total records</span>
              </div>
              <p className="text-xl font-medium text-text-primary">{snapshots.length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-6 mt-6 border-t border-border">
          <AccountForm
            mode="edit"
            account={account}
            allowedTypes={allowedTypes}
            isAsset={account.is_asset}
            onSaved={onSaved}
          />

          {account.status !== 'closed' && (
            <Button
              variant="ghost"
              className="justify-start gap-2 text-text-muted"
              onClick={() => onChangeStatus('closed')}
            >
              <Lock size={16} /> Close Account
            </Button>
          )}
          {account.status !== 'hidden' && (
            <Button
              variant="ghost"
              className="justify-start gap-2 text-text-muted"
              onClick={() => onChangeStatus('hidden')}
            >
              <EyeOff size={16} /> Hide Account
            </Button>
          )}
          {account.status !== 'active' && (
            <Button
              variant="ghost"
              className="justify-start gap-2 text-text-muted"
              onClick={() => onChangeStatus('active')}
            >
              Reactivate
            </Button>
          )}

          <Dialog>
            <DialogTrigger
              render={
                <Button
                  variant="ghost"
                  className="justify-start gap-2 text-negative hover:bg-negative/10 hover:text-negative"
                />
              }
            >
              <Trash2 size={16} /> Delete Account
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete {account.name}?</DialogTitle>
              </DialogHeader>
              <p className="text-text-muted text-sm">
                This can't be undone. All records for this account will be deleted too.
              </p>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                <Button variant="destructive" onClick={onDeleteAccount}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}