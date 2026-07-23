'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/hooks/use-categories'
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
import type { components } from '@finance-app/api-spec'

type Transaction = components['schemas']['Transaction']
type Account = components['schemas']['Account']

export function TransactionForm({
  mode,
  trigger = mode === 'create' ? 'button' : 'icon',
  transaction,
  onSaved,
}: {
  mode: 'create' | 'edit'
  trigger?: 'button' | 'icon'
  transaction?: Transaction
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (mode === 'edit' && !transaction) {
      setError('Missing transaction to update.')
      return
    }

    setSubmitting(true)
    setError(null)

    const token = await getToken()
    const client = createApiClient(token)

    const body = {
      amount: parseFloat(amount),
      description: description || null,
      account_id: parseInt(accountId),
      category_id: categoryId ? parseInt(categoryId) : null,
      posted_date: new Date(postedDate).toISOString(),
    }

    const res = mode === 'create'
      ? await client.POST('/transactions', { body })
      : await client.PUT('/transactions/{id}', { params: { path: { id: transaction!.id } }, body })

    setSubmitting(false)

    if (res.error) {
      setError('Something went wrong saving this transaction. Please try again.')
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
        <SheetTrigger render={<Button variant="default" size="sm" className="gap-1.5" />}>
          <Plus size={14} /> Add Transaction
        </SheetTrigger>
      )}
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>{mode === 'create' ? 'Add Transaction' : 'Edit Transaction'}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1 overflow-y-auto">
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
              <Select value={accountId} onValueChange={(v) => v && setAccountId(v)}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Select an account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="postedDate">Date</Label>
              <Input id="postedDate" type="date" value={postedDate} onChange={(e) => setPostedDate(e.target.value)} required />
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