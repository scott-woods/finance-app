'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { LineChart, Line, XAxis, CartesianGrid } from 'recharts'
import { createApiClient } from '@/lib/api'
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { components } from '@finance-app/api-spec'
import { AccountForm } from './account-form'
import { AddRecordForm } from './add-record-form'

type AccountType = components['schemas']['AccountType']
type NetWorthSummary = components['schemas']['NetWorthSummary']
type AccountTypeGroup = components['schemas']['AccountTypeGroup']
type NetWorthTrendPoint = components['schemas']['NetWorthTrendPoint']

const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'real_estate', 'vehicle', 'other_asset']
const DEBT_TYPES: AccountType[] = ['credit_card', 'loan', 'other_debt']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const chartConfig = {
  net_worth: { label: 'Net Worth', color: 'var(--color-accent)' },
} satisfies ChartConfig

export default function AccountsPage() {
  const { getToken } = useAuth()
  const [summary, setSummary] = useState<NetWorthSummary | null>(null)
  const [trend, setTrend] = useState<NetWorthTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [summaryRes, trendRes] = await Promise.all([
      client.GET('/net-worth/summary'),
      client.GET('/net-worth/trend'),
    ])
    if (!summaryRes.error) setSummary(summaryRes.data ?? null)
    if (!trendRes.error) setTrend(trendRes.data ?? [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading || !summary) return <p className="text-text-muted">Loading...</p>

  const sortedAssetGroups = sortGroups(summary.asset_groups)
  const sortedDebtGroups = sortGroups(summary.debt_groups)

  const chartData = trend.map((p) => ({
    date: new Date(p.as_of_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    net_worth: p.net_worth,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center">
          <p className="text-text-muted text-sm uppercase tracking-wide">Net Worth</p>
          <h1 className="font-display text-4xl text-text-primary mt-1">
            {currency(summary.net_worth)}
          </h1>
          <div className="flex gap-3 mt-3">
            <span className="text-sm text-positive bg-positive/10 rounded-full px-3 py-1">
              Assets: {currency(summary.total_assets)}
            </span>
            <span className="text-sm text-negative bg-negative/10 rounded-full px-3 py-1">
              Debts: {currency(summary.total_debts)}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Trend</p>
          {chartData.length < 2 ? (
            <p className="text-text-muted text-sm">Not enough history yet to chart a trend.</p>
          ) : (
            <ChartContainer config={chartConfig} className="h-[140px] w-full">
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  dataKey="net_worth"
                  stroke="var(--color-net_worth)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <AccountColumn title="Assets" groups={sortedAssetGroups} allowedTypes={ASSET_TYPES} isAsset={true} onSaved={refresh} />
        <AccountColumn title="Debts" groups={sortedDebtGroups} allowedTypes={DEBT_TYPES} isAsset={false} onSaved={refresh} />
      </div>
    </div>
  )
}

function sortGroups(groups: AccountTypeGroup[]): AccountTypeGroup[] {
  return [...groups]
    .sort((a, b) => b.subtotal - a.subtotal)
    .map((g) => ({
      ...g,
      accounts: [...g.accounts].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)),
    }))
}

function AccountColumn({
  title,
  groups,
  allowedTypes,
  isAsset,
  onSaved,
}: {
  title: string
  groups: AccountTypeGroup[]
  allowedTypes: AccountType[]
  isAsset: boolean
  onSaved: () => void
}) {
  const amountColor = isAsset ? 'text-positive' : 'text-negative'

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-muted text-sm uppercase tracking-wide font-medium">{title}</h2>
        <AccountForm mode="create" allowedTypes={allowedTypes} isAsset={isAsset} onSaved={onSaved} />
      </div>

      {groups.length === 0 ? (
        <p className="text-text-muted text-sm">None yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.type}>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-text-primary text-sm font-medium">
                  {ACCOUNT_TYPE_LABELS[group.type]}
                </p>
                <p className={`text-base font-semibold ${amountColor}`}>
                  {currency(group.subtotal)}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {group.accounts.map((account) => {
                  const Icon = ACCOUNT_TYPE_ICONS[account.type]
                  return (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 bg-background/60 border border-border rounded-lg p-3"
                    >
                      <div className="shrink-0 bg-accent/15 text-accent rounded-full p-2">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary text-base font-medium truncate">
                          {account.name}
                        </p>
                        {account.balance != null ? (
                          <p className="text-xs text-text-muted">
                            {new Date(account.as_of_date!).toLocaleDateString()}
                          </p>
                        ) : (
                          <p className="text-xs text-text-muted">No records yet</p>
                        )}
                      </div>
                      {account.balance != null && (
                        <p className={`text-lg font-semibold ${amountColor} shrink-0`}>
                          {currency(account.balance)}
                        </p>
                      )}
                      <div className="flex gap-1 shrink-0">
                        <AddRecordForm accountId={account.id} accountName={account.name} onSaved={onSaved} />
                        <Link href={`/accounts/${account.id}`}>
                          <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent">
                            <ArrowUpRight size={16} />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}