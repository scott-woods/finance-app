'use client'

import { useAuth } from '@clerk/nextjs'
import { useState } from 'react'
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
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountType = components['schemas']['AccountType']

export function AccountForm({
  mode,
  account,
  allowedTypes,
  isAsset,
  onSaved,
}: {
  mode: 'create' | 'edit'
  account?: Account
  allowedTypes: AccountType[]
  isAsset: boolean
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(account?.name ?? '')
  const [type, setType] = useState<AccountType>(account?.type ?? allowedTypes[0])
  const [creditLimit, setCreditLimit] = useState(account?.credit_limit?.toString() ?? '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)

    const body = {
        name,
        type,
        is_asset: isAsset,
        credit_limit: creditLimit ? parseFloat(creditLimit) : null,
        status: account?.status ?? 'active',
    }

    if (mode === 'create') {
      await client.POST('/accounts', { body })
    } else if (account) {
      await client.PUT('/accounts/{id}', { params: { path: { id: account.id } }, body })
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} className={mode === 'create' ? 'font-semibold' : ''} />}>
            {mode === 'create' ? `Add ${isAsset ? 'Asset' : 'Debt'}` : 'Edit'}
        </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>
              {mode === 'create' ? `Add ${isAsset ? 'Asset' : 'Debt'}` : 'Edit Account'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type">Type</Label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value as AccountType)}
                className="border border-border bg-card rounded-md px-3 py-2 text-sm"
              >
                {allowedTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
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
            <SheetClose render={<Button type="button" variant="outline" />}>Cancel</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}