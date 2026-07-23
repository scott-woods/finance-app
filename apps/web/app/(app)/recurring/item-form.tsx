'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/hooks/use-categories'
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

type RecurringItem = components['schemas']['RecurringItem']
type RecurringItemKind = components['schemas']['RecurringItemKind']
type RecurringFrequency = components['schemas']['RecurringFrequency']
type Account = components['schemas']['Account']

const KINDS: RecurringItemKind[] = ['income', 'expense', 'investment_contribution', 'transfer']
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'biweekly', 'monthly', 'annual']

export function RecurringItemForm({
  mode,
  item,
  onSaved,
}: {
  mode: 'create' | 'edit'
  item?: RecurringItem
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)

  const [kind, setKind] = useState<RecurringItemKind>(item?.kind ?? 'expense')
  const [name, setName] = useState(item?.name ?? '')
  const [frequency, setFrequency] = useState<RecurringFrequency>(item?.frequency ?? 'monthly')
  const [amount, setAmount] = useState(item?.estimated_amount?.toString() ?? '')
  const [startDate, setStartDate] = useState(
    item?.start_date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
  )
  const [endDate, setEndDate] = useState(item?.end_date?.slice(0, 10) ?? '')
  const [categoryId, setCategoryId] = useState(item?.category_id?.toString() ?? '')
  const [accountId, setAccountId] = useState(item?.account_id?.toString() ?? '')
  const [preTax, setPreTax] = useState(item?.pre_tax ?? false)

  useEffect(() => {
    async function loadAccounts() {
      const token = await getToken()
      const client = createApiClient(token)
      const { data } = await client.GET('/accounts')
      setAccounts(data ?? [])
    }
    if (open) loadAccounts()
  }, [open, getToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)

    const body = {
      kind,
      name,
      frequency,
      estimated_amount: parseFloat(amount),
      start_date: new Date(startDate).toISOString(),
      end_date: endDate ? new Date(endDate).toISOString() : null,
      category_id: categoryId ? parseInt(categoryId) : null,
      account_id: accountId ? parseInt(accountId) : null,
      active: true,
      pre_tax: kind === 'investment_contribution' ? preTax : false,
    }

    if (mode === 'create') {
      await client.POST('/recurring-items', { body })
    } else if (item) {
      await client.PUT('/recurring-items/{id}', { params: { path: { id: item.id } }, body })
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" />}>
        {mode === 'create' ? 'Add Recurring Item' : 'Edit'}
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{mode === 'create' ? 'Add Recurring Item' : 'Edit Recurring Item'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Type</Label>
              <select
                id="kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as RecurringItemKind)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm"
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>{k.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            {kind === 'investment_contribution' && (
              <div className="flex items-center gap-2">
                <input id="preTax" type="checkbox" checked={preTax} onChange={(e) => setPreTax(e.target.checked)} />
                <Label htmlFor="preTax">Pre-tax (deducted before paycheck, e.g. 401k)</Label>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frequency">Frequency</Label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Estimated amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">End date (optional)</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account">Account</Label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
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