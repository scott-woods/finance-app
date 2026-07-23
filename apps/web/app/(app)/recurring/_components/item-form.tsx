'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/hooks/use-categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
import type { components } from '@finance-app/api-spec'

type RecurringItem = components['schemas']['RecurringItem']
type RecurringItemKind = components['schemas']['RecurringItemKind']
type RecurringFrequency = components['schemas']['RecurringFrequency']
type Account = components['schemas']['Account']

const KINDS: RecurringItemKind[] = ['income', 'expense', 'investment_contribution', 'transfer']
const KIND_LABELS: Record<RecurringItemKind, string> = {
  income: 'Income',
  expense: 'Expense',
  investment_contribution: 'Investment Contribution',
  transfer: 'Transfer',
}
const FREQUENCIES: RecurringFrequency[] = ['weekly', 'biweekly', 'monthly', 'annual']

export function RecurringItemForm({
  mode,
  trigger = mode === 'create' ? 'button' : 'icon',
  createLabel = 'Add Item',
  item,
  onSaved,
}: {
  mode: 'create' | 'edit'
  trigger?: 'button' | 'icon'
  createLabel?: string
  item?: RecurringItem
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (mode === 'edit' && !item) {
      setError('Missing item to update.')
      return
    }

    setSubmitting(true)
    setError(null)

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

    const res = mode === 'create'
      ? await client.POST('/recurring-items', { body })
      : await client.PUT('/recurring-items/{id}', { params: { path: { id: item!.id } }, body })

    setSubmitting(false)

    if (res.error) {
      setError('Something went wrong saving this item. Please try again.')
      return
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger === 'icon' ? (
        <SheetTrigger render={<Button variant="ghost" size="icon" className="text-text-muted hover:text-accent" />}>
          <Pencil size={16} />
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" className="gap-1.5" />}>
          {mode === 'create' ? (
            <>
              <Plus size={14} /> {createLabel}
            </>
          ) : (
            <>
              <Pencil size={14} /> Edit
            </>
          )}
        </SheetTrigger>
      )}
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{mode === 'create' ? 'Add Recurring Item' : 'Edit Recurring Item'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1 overflow-y-auto">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="kind">Type</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as RecurringItemKind)}>
                <SelectTrigger id="kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {kind === 'investment_contribution' && (
              <div className="flex items-center gap-2">
                <Checkbox id="preTax" checked={preTax} onCheckedChange={(checked) => setPreTax(checked === true)} />
                <Label htmlFor="preTax">Pre-tax (deducted before paycheck, e.g. 401k)</Label>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurringFrequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f} value={f} className="capitalize">
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v && v !== 'none' ? v : '')}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account">Account</Label>
              <Select value={accountId || 'none'} onValueChange={(v) => setAccountId(v && v !== 'none' ? v : '')}>
                <SelectTrigger id="account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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