'use client'

import { useAuth } from '@clerk/nextjs'
import { useState } from 'react'
import { createApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet'
import { ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import type { components } from '@finance-app/api-spec'
import { Pencil, Plus } from 'lucide-react'

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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const token = await getToken()
    const client = createApiClient(token)

    const body = {
      name,
      type,
      is_asset: isAsset,
      credit_limit: type === 'credit_card' && creditLimit ? parseFloat(creditLimit) : null,
      status: account?.status ?? 'active',
    }

    const res = mode === 'create'
      ? await client.POST('/accounts', { body })
      : account
        ? await client.PUT('/accounts/{id}', { params: { path: { id: account.id } }, body })
        : null

    setSubmitting(false)

    if (res?.error) {
      setError('Something went wrong saving this account. Please try again.')
      return
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} className={`gap-1.5 ${mode === 'create' ? 'font-semibold' : ''}`} />}>
        {mode === 'create' ? (
          <>
            <Plus size={16} /> {`Add ${isAsset ? 'Asset' : 'Debt'}`}
          </>
        ) : (
          <>
            <Pencil size={14} /> Edit
          </>
        )}
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
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {allowedTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ACCOUNT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === 'credit_card' && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="creditLimit">Credit limit (optional)</Label>
                <Input
                  id="creditLimit"
                  type="number"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                />
              </div>
            )}
            {error && <p className="text-sm text-negative">{error}</p>}
          </div>
          <SheetFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save'}
            </Button>
            <SheetClose render={<Button type="button" variant="outline" />}>Cancel</SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}