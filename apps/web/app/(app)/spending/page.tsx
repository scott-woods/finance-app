'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, CartesianGrid, ReferenceLine } from 'recharts'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/lib/use-categories'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { components } from '@finance-app/api-spec'
import { TransactionForm } from './transaction-form'

type Transaction = components['schemas']['Transaction']
type SpendingSummary = components['schemas']['SpendingSummary']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const chartConfig = {
  amount: { label: 'Spent', color: 'var(--color-accent)' },
} satisfies ChartConfig

export default function SpendingPage() {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [summary, setSummary] = useState<SpendingSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [summaryRes, txRes] = await Promise.all([
      client.GET('/spending/summary', { params: { query: cursor } }),
      client.GET('/transactions', { params: { query: cursor } }),
    ])
    setSummary(summaryRes.data ?? null)
    setTransactions(txRes.data ?? [])
    setLoading(false)
  }, [getToken, cursor])

  useEffect(() => {
    setLoading(true)
    refresh()
  }, [refresh])

  async function handleDelete(id: number) {
    const token = await getToken()
    const client = createApiClient(token)
    await client.DELETE('/transactions/{id}', { params: { path: { id } } })
    refresh()
  }

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    })
  }

  if (loading || !summary) return <p className="text-text-muted">Loading...</p>

  const monthLabel = new Date(cursor.year, cursor.month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const ringPct = summary.available > 0
    ? Math.max(0, Math.min(100, (summary.remaining / summary.available) * 100))
    : 0
  const ringColor = ringPct > 25 ? 'var(--color-positive)' : ringPct > 0 ? 'var(--color-accent)' : 'var(--color-negative)'

  const chartData = summary.daily_spending.map((d) => ({
    day: new Date(d.date).getDate(),
    amount: d.amount,
  }))

  const grouped = new Map<string, Transaction[]>()
  for (const tx of transactions) {
    const key = new Date(tx.posted_date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(tx)
  }

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    const token = await getToken()
    const client = createApiClient(token)
    const { data, error } = await client.POST('/simplefin/sync')
    if (!error && data) {
      setSyncResult(`Imported ${data.transactions_imported}, skipped ${data.transactions_skipped}`)
      refresh()
    } else {
      setSyncResult('Sync failed — check the server logs')
    }
    setSyncing(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(-1)}>
          <ChevronLeft size={18} />
        </Button>
        <h1 className="font-display text-2xl text-text-primary w-48 text-center">{monthLabel}</h1>
        <Button variant="ghost" size="icon" onClick={() => shiftMonth(1)}>
          <ChevronRight size={18} />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-4">Monthly Spending</p>
          <div
            className="relative w-40 h-40 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${ringColor} ${ringPct * 3.6}deg, var(--color-border) 0deg)`,
            }}
          >
            <div className="absolute w-28 h-28 rounded-full bg-card" />
          </div>
          <p className="text-text-primary text-sm mt-4 text-center">
            {currency(summary.remaining)} of {currency(summary.available)} available
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-4">Spending History</p>
          <ChartContainer config={chartConfig} className="h-[180px] w-full">
            <BarChart data={chartData}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="day"
                type="number"
                domain={[1, summary.days_in_month]}
                ticks={[1, 5, 10, 15, 20, 25, summary.days_in_month]}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ReferenceLine y={summary.target_daily_average} stroke="var(--color-text-muted)" strokeDasharray="4 4" />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={2} barSize={8} />
            </BarChart>
          </ChartContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-4">Metrics</p>
          <div className="flex flex-col gap-3">
            <MetricRow label="Actual average per day" value={currency(summary.actual_daily_average)} />
            <MetricRow label="Target daily average" value={currency(summary.target_daily_average)} />
            <MetricRow
              label="Safe to spend/day (remaining)"
              value={currency(summary.safe_to_spend_per_day)}
              highlight
            />
            <MetricRow label="Days remaining" value={`${summary.days_remaining} of ${summary.days_in_month}`} />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-text-muted text-sm uppercase tracking-wide">Transactions</p>
            <div className="flex items-center gap-2">
              {syncResult && <p className="text-xs text-text-muted">{syncResult}</p>}
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                <RefreshCw size={14} className={`mr-1 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Amex'}
              </Button>
              <TransactionForm mode="create" onSaved={refresh} />
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto flex flex-col gap-4">
            {Array.from(grouped.entries()).map(([date, txs]) => (
              <div key={date}>
                <p className="text-xs text-text-muted uppercase tracking-wide mb-2">{date}</p>
                <div className="flex flex-col divide-y divide-border">
                  {txs.map((tx) => {
                    const category = categories.find((c) => c.id === tx.category_id)
                    return (
                      <div key={tx.id} className="flex items-center justify-between py-2">
                        <div>
                          <p className="text-text-primary text-sm">{tx.description || category?.name || 'Transaction'}</p>
                          {category && <p className="text-xs text-text-muted">{category.name}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-negative text-sm font-medium">{currency(tx.amount)}</p>
                          <TransactionForm mode="edit" transaction={tx} onSaved={refresh} />
                          <Button variant="ghost" size="icon" className="text-text-muted hover:text-negative" onClick={() => handleDelete(tx.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-text-muted text-sm">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-text-muted text-sm">{label}</p>
      <p className={`text-sm font-medium ${highlight ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}