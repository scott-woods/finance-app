'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, PieChart, BarChart3, Receipt, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, CartesianGrid, ReferenceLine, YAxis } from 'recharts'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/hooks/use-categories'
import { currency } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { components } from '@finance-app/api-spec'
import { TransactionForm } from './_components/transaction-form'

type Transaction = components['schemas']['Transaction']
type SpendingSummary = components['schemas']['SpendingSummary']

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
    const res = await client.DELETE('/transactions/{id}', { params: { path: { id } } })
    if (res.error) return // TODO: surface an error to the user
    refresh()
  }

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const date = new Date(prev.year, prev.month - 1 + delta, 1)
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    })
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

  if (loading || !summary) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

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

  const highestDay = summary.daily_spending.reduce(
    (max, d) => (d.amount > max.amount ? d : max),
    { date: '', amount: 0 }
  )

  const highestDayLabel = highestDay.date
    ? new Date(highestDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—'

  const avgPerTransaction = transactions.length > 0
    ? transactions.reduce((sum, tx) => sum + tx.amount, 0) / transactions.length
    : 0

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <CardContent className="p-0 flex flex-col items-center">
            <CardSectionHeader icon={PieChart} title="Monthly Spending" />

            <div
              className="relative w-44 h-44 rounded-full flex items-center justify-center mt-2"
              style={{
                background: `conic-gradient(${ringColor} ${ringPct * 3.6}deg, var(--color-border) 0deg)`,
              }}
            >
              <div className="absolute w-32 h-32 rounded-full bg-card" />
            </div>

            <p className="text-text-primary text-lg mt-4 text-center">
              {currency(summary.remaining)} of {currency(summary.available)} available
            </p>

            <div className="flex items-center gap-6 mt-3 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ringColor }} />
                Remaining
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-border" />
                Spent
              </span>
            </div>

            <div className="w-full flex flex-col gap-3 mt-6 pt-6 border-t border-border">
              <MetricRow label="Actual average per day" value={currency(summary.actual_daily_average)} />
              <MetricRow label="Target daily average" value={currency(summary.target_daily_average)} />
              <MetricRow
                label="Safe to spend/day (remaining)"
                value={currency(summary.safe_to_spend_per_day)}
                highlight
              />
              <MetricRow label="Days remaining" value={`${summary.days_remaining} of ${summary.days_in_month}`} />
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <CardSectionHeader icon={BarChart3} title="Spending History" />
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[1, summary.days_in_month]}
                  ticks={[1, 5, 10, 15, 20, 25, summary.days_in_month]}
                  tickLine={false}
                  axisLine={false}
                  fontSize={13}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={13}
                  tickFormatter={(v) => `$${v}`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine y={summary.target_daily_average} stroke="var(--color-text-muted)" strokeDasharray="4 4" />
                <Bar dataKey="amount" fill="var(--color-amount)" radius={2} barSize={8} />
              </BarChart>
            </ChartContainer>

            <div className="flex flex-col gap-3 mt-6 pt-6 border-t border-border">
              <MetricRow label="Highest single day" value={`${currency(highestDay.amount)} (${highestDayLabel})`} />
              <MetricRow label="Total transactions" value={transactions.length.toString()} />
              <MetricRow label="Average per transaction" value={currency(avgPerTransaction)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="p-6">
        <CardContent className="p-0">
          <CardSectionHeader
            icon={Receipt}
            title="Transactions"
            action={
              <div className="flex items-center gap-2">
                {syncResult && <p className="text-sm text-text-muted">{syncResult}</p>}
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
                  <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                  {syncing ? 'Syncing...' : 'Sync Amex'}
                </Button>
                <TransactionForm mode="create" onSaved={refresh} />
              </div>
            }
          />

          {transactions.length === 0 ? (
            <p className="text-text-muted text-base">No transactions yet.</p>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="flex flex-col gap-4 pr-4">
                {Array.from(grouped.entries()).map(([date, txs]) => (
                  <div key={date}>
                    <p className="text-sm text-text-muted uppercase tracking-wide mb-2">{date}</p>
                    <div className="flex flex-col divide-y divide-border">
                      {txs.map((tx) => {
                        const category = categories.find((c) => c.id === tx.category_id)
                        return (
                          <div key={tx.id} className="flex items-center justify-between py-3">
                            <div>
                              <p className="text-text-primary text-base">{tx.description || category?.name || 'Transaction'}</p>
                              {category && <p className="text-sm text-text-muted">{category.name}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-negative text-base font-medium">{currency(tx.amount)}</p>
                              <TransactionForm mode="edit" trigger="icon" transaction={tx} onSaved={refresh} />
                              <Button variant="ghost" size="icon" className="text-text-muted hover:text-negative" onClick={() => handleDelete(tx.id)}>
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function MetricRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-text-muted text-base">{label}</p>
      <p className={`text-base font-medium ${highlight ? 'text-accent' : 'text-text-primary'}`}>{value}</p>
    </div>
  )
}