'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MoreVertical, Trash2 } from 'lucide-react'
import { LineChart, Line, XAxis, CartesianGrid } from 'recharts'
import { createApiClient } from '@/lib/api'
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { AccountForm } from '../account-form'
import { AddRecordForm } from '../add-record-form'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']
type AccountType = components['schemas']['AccountType']

const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'real_estate', 'vehicle', 'other_asset']
const DEBT_TYPES: AccountType[] = ['credit_card', 'loan', 'other_debt']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const chartConfig = {
  balance: { label: 'Balance', color: 'var(--color-accent)' },
} satisfies ChartConfig

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = Number(params.id)
  const { getToken } = useAuth()

  const [account, setAccount] = useState<Account | null>(null)
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [accountRes, snapshotsRes] = await Promise.all([
      client.GET('/accounts/{id}', { params: { path: { id: accountId } } }),
      client.GET('/accounts/{id}/snapshots', { params: { path: { id: accountId } } }),
    ])
    if (!accountRes.error) setAccount(accountRes.data ?? null)
    if (!snapshotsRes.error) {
      const sorted = [...(snapshotsRes.data ?? [])].sort(
        (a, b) => new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
      )
      setSnapshots(sorted)
    }
    setLoading(false)
  }, [getToken, accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleDeleteSnapshot(snapshotId: number) {
    const token = await getToken()
    const client = createApiClient(token)
    await client.DELETE('/accounts/{id}/snapshots/{snapshotId}', {
      params: { path: { id: accountId, snapshotId } },
    })
    refresh()
  }

  async function handleStatusChange(status: 'active' | 'closed' | 'hidden') {
    if (!account) return
    const token = await getToken()
    const client = createApiClient(token)
    await client.PUT('/accounts/{id}', {
      params: { path: { id: accountId } },
      body: {
        name: account.name,
        type: account.type,
        is_asset: account.is_asset,
        credit_limit: account.credit_limit ?? null,
        status,
      },
    })
    refresh()
  }

  async function handleDeleteAccount() {
    const token = await getToken()
    const client = createApiClient(token)
    await client.DELETE('/accounts/{id}', { params: { path: { id: accountId } } })
    router.push('/accounts')
  }

  if (loading || !account) return <p className="text-text-muted">Loading...</p>

  const Icon = ACCOUNT_TYPE_ICONS[account.type]
  const amountColor = account.is_asset ? 'text-positive' : 'text-negative'
  const latest = snapshots[0]
  const previous = snapshots[1]
  const change = latest && previous ? latest.balance - previous.balance : null
  const changePct = change != null && previous.balance !== 0 ? (change / previous.balance) * 100 : null

  const chartData = [...snapshots]
    .reverse()
    .map((s) => ({
      date: new Date(s.as_of_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: s.balance,
    }))

  const historySpanDays =
    snapshots.length > 1
      ? Math.round(
          (new Date(snapshots[0].as_of_date).getTime() -
            new Date(snapshots[snapshots.length - 1].as_of_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0

  return (
    <div className="flex flex-col gap-6">
      <Link href="/accounts" className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm w-fit">
        <ArrowLeft size={14} /> Back
      </Link>

      <div className="bg-card border border-border rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-accent/15 text-accent rounded-full p-3">
            <Icon size={22} />
          </div>
          <div>
            <p className="text-text-muted text-sm">{ACCOUNT_TYPE_LABELS[account.type]}</p>
            <h1 className="font-display text-2xl text-text-primary">{account.name}</h1>
            {latest && (
              <p className="text-text-muted text-sm mt-1">
                Last updated {new Date(latest.as_of_date).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className={`font-display text-3xl ${amountColor}`}>
            {latest ? currency(latest.balance) : '—'}
          </p>
          {changePct != null && (
            <p className={`text-sm ${change! >= 0 ? 'text-positive' : 'text-negative'}`}>
              {change! >= 0 ? '↗' : '↘'} {changePct.toFixed(1)}% from previous
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-text-muted text-sm uppercase tracking-wide">Value Over Time</p>
            <AddRecordForm accountId={account.id} accountName={account.name} onSaved={refresh} />
          </div>
          {chartData.length < 2 ? (
            <p className="text-text-muted text-sm">Not enough history yet to chart a trend.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line dataKey="balance" stroke="var(--color-balance)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}

          <div className="mt-6">
            <p className="text-text-muted text-sm uppercase tracking-wide mb-3">All Records</p>
            <div className="flex flex-col divide-y divide-border">
              {snapshots.map((snap, i) => {
                const prev = snapshots[i + 1]
                const rowChange = prev ? snap.balance - prev.balance : null
                return (
                  <div key={snap.id} className="flex items-center justify-between py-3">
                    <p className="text-text-primary text-sm">
                      {new Date(snap.as_of_date).toLocaleDateString()}
                    </p>
                    <div className="flex items-center gap-4">
                      <p className="text-text-primary font-medium">{currency(snap.balance)}</p>
                      {rowChange != null && (
                        <p className={`text-xs ${rowChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                          {rowChange >= 0 ? '+' : ''}
                          {currency(rowChange)}
                        </p>
                      )}
                      <AddRecordForm
                        mode="edit"
                        accountId={account.id}
                        accountName={account.name}
                        snapshot={snap}
                        onSaved={refresh}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-text-muted hover:text-negative"
                        onClick={() => handleDeleteSnapshot(snap.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 flex flex-col gap-4 h-fit">
          <p className="text-text-muted text-sm uppercase tracking-wide">Details & Actions</p>

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Status</span>
              <span className="text-text-primary capitalize">{account.status ?? 'active'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">History span</span>
              <span className="text-text-primary">{historySpanDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Total records</span>
              <span className="text-text-primary">{snapshots.length}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <AccountForm
              mode="edit"
              account={account}
              allowedTypes={account.is_asset ? ASSET_TYPES : DEBT_TYPES}
              isAsset={account.is_asset}
              onSaved={refresh}
            />
            {account.status !== 'closed' && (
              <Button variant="outline" onClick={() => handleStatusChange('closed')}>
                Close Account
              </Button>
            )}
            {account.status !== 'hidden' && (
              <Button variant="outline" onClick={() => handleStatusChange('hidden')}>
                Hide Account
              </Button>
            )}
            {account.status !== 'active' && (
              <Button variant="outline" onClick={() => handleStatusChange('active')}>
                Reactivate
              </Button>
            )}
            <Dialog>
              <DialogTrigger render={<Button variant="destructive" />}>Delete Account</DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete {account.name}?</DialogTitle>
                </DialogHeader>
                <p className="text-text-muted text-sm">
                  This can't be undone. All records for this account will be deleted too.
                </p>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
                  <Button variant="destructive" onClick={handleDeleteAccount}>
                    Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </div>
  )
}