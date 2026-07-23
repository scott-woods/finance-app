'use client'

import { Show, SignInButton } from '@clerk/nextjs'
import { Wallet, PieChart, CreditCard } from 'lucide-react'
import { useDashboard } from '@/hooks/use-dashboard'
import { useNetWorth } from '@/hooks/use-net-worth'
import { currency } from '@/lib/format'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { StatLinkCard } from './_components/stat-link-card'
import { NetWorthSparkline } from './_components/net-worth-sparkline'
import { RecentTransactionsCard } from './_components/recent-transactions-card'
import { NotableRecurringCard } from './_components/notable-recurring-card'

export default function DashboardPage() {
  const { spending, recurringSummary, recurringItems, recentTransactions, loading: dashLoading } = useDashboard()
  const { summary: netWorth, trend, loading: netWorthLoading } = useNetWorth()

  const loading = dashLoading || netWorthLoading

  const today = new Date().getDate()
  const spentToday = spending?.daily_spending.find((d) => new Date(d.date).getDate() === today)?.amount ?? 0

  const trendData = trend.map((p) => ({ net_worth: p.net_worth }))

  return (
    <div className="flex flex-col gap-6">
      <Show when="signed-out">
        <div className="flex items-center justify-center h-64">
          <SignInButton mode="modal" />
        </div>
      </Show>

      <Show when="signed-in">
        {loading || !spending || !netWorth || !recurringSummary ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <>
            <Card className="p-6">
              <CardContent className="p-0">
                <CardSectionHeader icon={Wallet} title="Safe to Spend Today" />
                <h2 className="font-display text-5xl text-accent">
                  {currency(spending.safe_to_spend_per_day)}
                </h2>
                <p className="text-text-muted text-base mt-2">
                  You've spent {currency(spentToday)} today · {currency(spending.remaining)} left this month
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatLinkCard
                icon={Wallet}
                title="Net Worth"
                href="/accounts"
                value={currency(netWorth.net_worth)}
                caption={
                  <>
                    <span className="text-positive">{currency(netWorth.total_assets)}</span> assets ·{' '}
                    <span className="text-negative">{currency(netWorth.total_debts)}</span> debts
                  </>
                }
                sparkline={<NetWorthSparkline data={trendData} />}
              />

              <StatLinkCard
                icon={PieChart}
                title="Disposable Income"
                href="/recurring"
                value={currency(recurringSummary.disposable_income)}
                caption={`Savings rate ${recurringSummary.savings_rate.toFixed(1)}%`}
              />

              <StatLinkCard
                icon={CreditCard}
                title="This Month"
                href="/spending"
                value={`${currency(spending.spent_so_far)} spent`}
                valueColor="text-negative"
                caption={`of ${currency(spending.available)} · ${spending.days_remaining} days left`}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentTransactionsCard transactions={recentTransactions} />
              <NotableRecurringCard items={recurringItems} />
            </div>
          </>
        )}
      </Show>
    </div>
  )
}