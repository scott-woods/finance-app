'use client'

import { useNetWorth } from '@/hooks/use-net-worth'
import { sortGroups } from '@/lib/account-groups'
import { currency } from '@/lib/format'
import { ASSET_TYPES, DEBT_TYPES } from '@/types/accounts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { LineChart, Line, XAxis, CartesianGrid } from 'recharts'
import { AccountColumn } from './_components/account-column'
import { Skeleton } from '@/components/ui/skeleton'

const chartConfig = {
  net_worth: { label: 'Net Worth', color: 'var(--color-accent)' },
} satisfies ChartConfig

export default function AccountsPage() {
  const { summary, trend, loading, refresh } = useNetWorth()

  if (loading || !summary) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  const sortedAssetGroups = sortGroups(summary.asset_groups)
  const sortedDebtGroups = sortGroups(summary.debt_groups)

  const chartData = trend.map((p) => ({
    date: new Date(p.as_of_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    net_worth: p.net_worth,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card className="flex flex-col justify-center p-6">
          <CardContent className="p-0">
            <p className="text-text-muted text-sm uppercase tracking-wide">Net Worth</p>
            <h1 className="font-display text-4xl text-text-primary mt-1">
              {currency(summary.net_worth)}
            </h1>
            <div className="flex gap-3 mt-3">
              <Badge
                variant="outline"
                className="text-sm text-positive bg-positive/10 border-transparent rounded-full px-3 py-1"
              >
                Assets: {currency(summary.total_assets)}
              </Badge>
              <Badge
                variant="outline"
                className="text-sm text-negative bg-negative/10 border-transparent rounded-full px-3 py-1"
              >
                Debts: {currency(summary.total_debts)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="p-6">
          <CardContent className="p-0">
            <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Trend</p>
            {chartData.length < 2 ? (
              <p className="text-text-muted text-sm">Not enough history yet to chart a trend.</p>
            ) : (
              <ChartContainer config={chartConfig} className="h-[140px] w-full">
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="net_worth" stroke="var(--color-net_worth)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <AccountColumn title="Assets" groups={sortedAssetGroups} allowedTypes={ASSET_TYPES} isAsset={true} onSaved={refresh} />
        <AccountColumn title="Debts" groups={sortedDebtGroups} allowedTypes={DEBT_TYPES} isAsset={false} onSaved={refresh} />
      </div>
    </div>
  )
}