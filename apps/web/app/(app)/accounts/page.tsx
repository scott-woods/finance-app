'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { createApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountType = components['schemas']['AccountType']

const ACCOUNT_TYPES: AccountType[] = [
  'checking',
  'savings',
  'credit_card',
  'investment',
  'real_estate',
  'vehicle',
  'loan',
  'other_asset',
  'other_debt',
]

export default function AccountsPage() {
  const { getToken } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const { data, error } = await client.GET('/accounts')
    if (!error) setAccounts(data ?? [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleDelete(id: number) {
    const token = await getToken()
    const client = createApiClient(token)
    await client.DELETE('/accounts/{id}', { params: { path: { id } } })
    refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-text-primary">Accounts</h1>
        <AccountForm mode="create" onSaved={refresh} />
      </div>

      {loading ? (
        <p className="text-text-muted">Loading...</p>
      ) : accounts.length === 0 ? (
        <p className="text-text-muted">No accounts yet — add your first one above.</p>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div>
                <p className="text-text-primary">{account.name}</p>
                <p className="text-sm text-text-muted">
                  {account.type} · {account.is_asset ? 'Asset' : 'Debt'}
                  {account.credit_limit != null &&
                    ` · Limit $${account.credit_limit.toLocaleString()}`}
                </p>
              </div>
              <div className="flex gap-2">
                <AccountForm mode="edit" account={account} onSaved={refresh} />
                <DeleteAccountDialog
                  account={account}
                  onConfirm={() => handleDelete(account.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AccountForm({
  mode,
  account,
  onSaved,
}: {
  mode: 'create' | 'edit'
  account?: Account
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking')
  const [isAsset, setIsAsset] = useState(account?.is_asset ?? true)
  const [creditLimit, setCreditLimit] = useState(
    account?.credit_limit?.toString() ?? ''
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)

    const body = {
      name,
      type,
      is_asset: isAsset,
      credit_limit: creditLimit ? parseFloat(creditLimit) : null,
    }

    if (mode === 'create') {
      await client.POST('/accounts', { body })
    } else if (account) {
      await client.PUT('/accounts/{id}', {
        params: { path: { id: account.id } },
        body,
      })
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" />}>
            {mode === 'create' ? 'Add Account' : 'Edit'}
        </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{mode === 'create' ? 'Add Account' : 'Edit Account'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="border border-border bg-card rounded-md px-3 py-2 text-sm"
              >
                {ACCOUNT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isAsset"
                type="checkbox"
                checked={isAsset}
                onChange={(e) => setIsAsset(e.target.checked)}
              />
              <Label htmlFor="isAsset">This is an asset (unchecked = debt)</Label>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="creditLimit">Credit limit (optional)</Label>
              <Input
                id="creditLimit"
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit">Save</Button>
            <SheetClose render={<Button type="button" variant="outline" />}>
                Cancel
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function DeleteAccountDialog({
  account,
  onConfirm,
}: {
  account: Account
  onConfirm: () => void
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="text-negative" />}>
        Delete
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {account.name}?</DialogTitle>
        </DialogHeader>
        <p className="text-text-muted text-sm">
          This can't be undone. Any transactions or snapshots linked to this account will be affected.
        </p>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}