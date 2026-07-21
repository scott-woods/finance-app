'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/lib/use-categories'
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

type Transaction = components['schemas']['Transaction']
type Account = components['schemas']['Account']

export function TransactionForm({
  mode,
  transaction,
  onSaved,
}: {
  mode: 'create' | 'edit'
  transaction?: Transaction
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)

  const [amount, setAmount] = useState(transaction?.amount?.toString() ?? '')
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [accountId, setAccountId] = useState(transaction?.account_id?.toString() ?? '')
  const [categoryId, setCategoryId] = useState(transaction?.category_id?.toString() ?? '')
  const [postedDate, setPostedDate] = useState(
    transaction ? transaction.posted_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )

  useEffect(() => {
    async function loadAccounts() {
      const token = await getToken()
      const client = createApiClient(token)
      const { data } = await client.GET('/accounts')
      setAccounts((data ?? []).filter((a) => ['checking', 'savings', 'credit_card'].includes(a.type)))
    }
    if (open) loadAccounts()
  }, [open, getToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)

    const body = {
      amount: parseFloat(amount),
      description: description || null,
      account_id: parseInt(accountId),
      category_id: categoryId ? parseInt(categoryId) : null,
      posted_date: new Date(postedDate).toISOString(),
    }

    if (mode === 'create') {
      await client.POST('/transactions', { body })
    } else if (transaction) {
      await client.PUT('/transactions/{id}', { params: { path: { id: transaction.id } }, body })
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant={mode === 'create' ? 'default' : 'outline'} size="sm" />}>
        {mode === 'create' ? 'Add Transaction' : 'Edit'}
      </SheetTrigger>
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="account">Account</Label>
              <select
                id="account"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="border border-border bg-background rounded-md px-3 py-2 text-sm"
                required
              >
                <option value="" disabled>Select an account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
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
              <Label htmlFor="postedDate">Date</Label>
              <Input id="postedDate" type="date" value={postedDate} onChange={(e) => setPostedDate(e.target.value)} required />
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