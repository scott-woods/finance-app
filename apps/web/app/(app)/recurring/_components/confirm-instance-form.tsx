'use client'

import { useAuth } from '@clerk/nextjs'
import { useState } from 'react'
import { Check } from 'lucide-react'
import { createApiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type RecurringInstance = components['schemas']['RecurringInstance']

export function ConfirmInstanceForm({
  instance,
  onSaved,
}: {
  instance: RecurringInstance
  onSaved: () => void
}) {
  const { getToken } = useAuth()
  const [open, setOpen] = useState(false)
  const [actualAmount, setActualAmount] = useState(
    (instance.actual_amount ?? instance.estimated_amount).toString()
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = await getToken()
    const client = createApiClient(token)

    await client.PATCH('/recurring-instances/{id}', {
      params: { path: { id: instance.id } },
      body: {
        actual_amount: parseFloat(actualAmount),
        status: 'confirmed',
      },
    })

    setOpen(false)
    onSaved()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Check size={14} className="mr-1" /> Confirm
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Confirm {instance.item_name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-4">
            <Label htmlFor="actualAmount">Actual amount</Label>
            <Input
              id="actualAmount"
              type="number"
              step="0.01"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit">Confirm</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}