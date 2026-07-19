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
  accountId,
  accountName,
  snapshot,
  onSaved,
}: {
  mode?: 'create' | 'edit'
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)
    const body = {
      balance: parseFloat(balance),
      as_of_date: new Date(asOfDate).toISOString(),
    }

    if (mode === 'create') {
      await client.POST('/accounts/{id}/snapshots', {
        params: { path: { id: accountId } },
        body,
      })
    } else if (snapshot) {
      await client.PUT('/accounts/{id}/snapshots/{snapshotId}', {
        params: { path: { id: accountId, snapshotId: snapshot.id } },
        body,
      })
    }

    setOpen(false)
    onSaved()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent" />
        }
      >
        {mode === 'create' ? <Plus size={16} /> : <Pencil size={14} />}
      </SheetTrigger>
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