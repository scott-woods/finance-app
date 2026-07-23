'use client'

import { useAuth } from '@clerk/nextjs'
import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
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

type AccountSnapshot = components['schemas']['AccountSnapshot']

export function AddRecordForm({
  mode = 'create',
  trigger = 'icon',
  accountId,
  accountName,
  snapshot,
  onSaved,
}: {
  mode?: 'create' | 'edit'
  trigger?: 'icon' | 'button'
  accountId: number
  accountName: string
  snapshot?: AccountSnapshot
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [balance, setBalance] = useState(snapshot?.balance?.toString() ?? '')
  const [asOfDate, setAsOfDate] = useState(
    snapshot ? snapshot.as_of_date.slice(0, 10) : new Date().toISOString().slice(0, 10)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'edit' && !snapshot) {
      setError('Missing record to update.')
      return
    }

    setSubmitting(true)
    setError(null)

    const token = await getToken()
    const client = createApiClient(token)
    const body = {
      balance: parseFloat(balance),
      as_of_date: new Date(asOfDate).toISOString(),
    }

    const res = mode === 'create'
      ? await client.POST('/accounts/{id}/snapshots', {
          params: { path: { id: accountId } },
          body,
        })
      : await client.PUT('/accounts/{id}/snapshots/{snapshotId}', {
          params: { path: { id: accountId, snapshotId: snapshot!.id } },
          body,
        })

    setSubmitting(false)

    if (res.error) {
      setError('Something went wrong saving this record. Please try again.')
      return
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger === 'icon' ? (
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent" />
          }
        >
          {mode === 'create' ? <Plus size={16} /> : <Pencil size={14} />}
        </SheetTrigger>
      ) : (
        <SheetTrigger render={<Button className="gap-1.5" />}>
          <Plus size={16} /> Add Record
        </SheetTrigger>
      )}
      <SheetContent>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>
              {mode === 'create' ? 'Add Record' : 'Edit Record'} — {accountName}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 flex-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="balance">Balance</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asOfDate">As of date</Label>
              <Input
                id="asOfDate"
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                required
              />
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