'use client'

import { useAuth, Show, SignInButton, UserButton } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { createApiClient } from '@/lib/api'
import type { components } from '@finance-app/api-spec'

type SpendingSummary = components['schemas']['SpendingSummary']
type NetWorthSummary = components['schemas']['NetWorthSummary']
type RecurringSummary = components['schemas']['RecurringSummary']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function DashboardPage() {
  const { getToken } = useAuth()
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null)
  const [recurring, setRecurring] = useState<RecurringSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const now = new Date()
    const query = { year: now.getFullYear(), month: now.getMonth() + 1 }

    const [spendingRes, netWorthRes, recurringRes] = await Promise.all([
      client.GET('/spending/summary', { params: { query } }),
      client.GET('/net-worth/summary'),
      client.GET('/recurring-items/summary'),
    ])
    setSpending(spendingRes.data ?? null)
    setNetWorth(netWorthRes.data ?? null)
    setRecurring(recurringRes.data ?? null)
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  const today = new Date().getDate()
  const spentToday = spending?.daily_spending.find((d) => new Date(d.date).getDate() === today)?.amount ?? 0

  return (
    <div className="flex flex-col gap-6">
      <Show when="signed-out">
        <div className="flex items-center justify-center h-64">
          <SignInButton mode="modal" />
        </div>
      </Show>

      <Show when="signed-in">
        {loading || !spending || !netWorth || !recurring ? (
          <p className="text-text-muted">Loading...</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h1 className="font-display text-2xl text-text-primary">Dashboard</h1>
              <UserButton />
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-text-muted text-sm uppercase tracking-wide">Safe to spend today</p>
              <h2 className="font-display text-4xl text-accent mt-1">
                {currency(spending.safe_to_spend_per_day)}
              </h2>
              <p className="text-text-muted text-sm mt-2">
                You've spent {currency(spentToday)} today · {currency(spending.remaining)} left this month
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Net Worth</p>
                <p className="font-display text-2xl text-text-primary">{currency(netWorth.net_worth)}</p>
                <p className="text-xs text-text-muted mt-2">
                  <span className="text-positive">{currency(netWorth.total_assets)}</span> assets ·{' '}
                  <span className="text-negative">{currency(netWorth.total_debts)}</span> debts
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Disposable Income</p>
                <p className="font-display text-2xl text-text-primary">{currency(recurring.disposable_income)}</p>
                <p className="text-xs text-text-muted mt-2">
                  Savings rate {recurring.savings_rate.toFixed(1)}%
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-text-muted text-sm uppercase tracking-wide mb-2">This Month</p>
                <p className="font-display text-2xl text-text-primary">
                  {currency(spending.spent_so_far)} <span className="text-sm text-text-muted">spent</span>
                </p>
                <p className="text-xs text-text-muted mt-2">
                  of {currency(spending.available)} · {spending.days_remaining} days left
                </p>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  )
}