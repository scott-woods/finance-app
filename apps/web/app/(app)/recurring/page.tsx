'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { Wallet, TrendingUp, CreditCard, PieChart } from 'lucide-react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/hooks/use-categories'
import { currency } from '@/lib/format'
import { monthlyEquivalent } from '@/lib/recurring'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import { Skeleton } from '@/components/ui/skeleton'
import { ItemListCard } from './_components/item-list-card'
import { ItemRow } from './_components/item-row'
import type { components } from '@finance-app/api-spec'

type RecurringItem = components['schemas']['RecurringItem']
type RecurringSummary = components['schemas']['RecurringSummary']

export default function RecurringPage() {
  const { getToken } = useAuth()
  const categories = useCategories()
  const [items, setItems] = useState<RecurringItem[]>([])
  const [summary, setSummary] = useState<RecurringSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [itemsRes, summaryRes] = await Promise.all([
      client.GET('/recurring-items'),
      client.GET('/recurring-items/summary'),
    ])
    setItems(itemsRes.data ?? [])
    setSummary(summaryRes.data ?? null)
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function handleDelete(id: number) {
    const token = await getToken()
    const client = createApiClient(token)
    const res = await client.DELETE('/recurring-items/{id}', { params: { path: { id } } })
    if (res.error) return // TODO: surface an error to the user
    refresh()
  }

  if (loading || !summary) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  const income = items.filter((i) => i.kind === 'income').sort((a, b) => b.estimated_amount - a.estimated_amount)
  const investmentsPre = items
    .filter((i) => i.kind === 'investment_contribution' && i.pre_tax)
    .sort((a, b) => b.estimated_amount - a.estimated_amount)
  const investmentsPost = items
    .filter((i) => i.kind === 'investment_contribution' && !i.pre_tax)
    .sort((a, b) => b.estimated_amount - a.estimated_amount)
  const expenses = items.filter((i) => i.kind === 'expense')

  const expensesByCategory = new Map<string, RecurringItem[]>()
  for (const item of expenses) {
    const cat = categories.find((c) => c.id === item.category_id)
    const key = cat?.name ?? 'Uncategorized'
    if (!expensesByCategory.has(key)) expensesByCategory.set(key, [])
    expensesByCategory.get(key)!.push(item)
  }
  const expenseGroups = Array.from(expensesByCategory.entries())
    .map(([name, groupItems]) => ({
      name,
      items: groupItems.sort((a, b) => b.estimated_amount - a.estimated_amount),
      total: groupItems.reduce((sum, i) => sum + monthlyEquivalent(i.estimated_amount, i.frequency), 0),
    }))
    .sort((a, b) => b.total - a.total)

  const pctOf = (n: number) => (summary.total_income > 0 ? Math.max(0, (n / summary.total_income) * 100) : 0)
  const expensePct = pctOf(summary.total_expenses)
  const investPct = pctOf(summary.total_investments_post_tax)
  const disposablePct = pctOf(summary.disposable_income)

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <CardContent className="p-0">
          <CardSectionHeader icon={PieChart} title="Disposable Income" />
          <h1 className="font-display text-5xl text-text-primary mb-4">
            {currency(summary.disposable_income)}
          </h1>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            <div className="bg-negative" style={{ width: `${expensePct}%` }} />
            <div className="bg-positive" style={{ width: `${investPct}%` }} />
            <div className="bg-accent" style={{ width: `${disposablePct}%` }} />
          </div>
          <div className="flex gap-5 text-base text-text-muted">
            <span><span className="text-negative">●</span> Expenses {expensePct.toFixed(0)}%</span>
            <span><span className="text-positive">●</span> Investments {investPct.toFixed(0)}%</span>
            <span><span className="text-accent">●</span> Disposable {disposablePct.toFixed(0)}%</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-5">
          <CardContent className="p-0">
            <CardSectionHeader icon={Wallet} title="Income" />
            <p className="font-display text-3xl text-text-primary">{currency(summary.total_income)}</p>
            <p className="text-sm text-text-muted mt-2">Take-home, post-tax</p>
          </CardContent>
        </Card>
        <Card className="p-5">
          <CardContent className="p-0">
            <CardSectionHeader icon={TrendingUp} title="Investments" />
            <p className="font-display text-3xl text-positive">
              {currency(summary.total_investments_pre_tax + summary.total_investments_post_tax)}
            </p>
            <p className="text-sm text-text-muted mt-2">Before income {currency(summary.total_investments_pre_tax)}</p>
            <p className="text-sm text-text-muted">After income {currency(summary.total_investments_post_tax)}</p>
            <p className="text-sm text-positive mt-2">
              Savings rate {summary.savings_rate.toFixed(1)}% of effective income
            </p>
          </CardContent>
        </Card>
        <Card className="p-5">
          <CardContent className="p-0">
            <CardSectionHeader icon={CreditCard} title="Expenses" />
            <p className="font-display text-3xl text-negative">{currency(summary.total_expenses)}</p>
            <p className="text-sm text-text-muted mt-2">Monthly, annual amortized in</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <ItemListCard icon={Wallet} title="Income" onSaved={refresh} createLabel="Add Income">
            <div className="flex flex-col divide-y divide-border">
              {income.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
              {income.length === 0 && <p className="text-text-muted text-base py-2">None yet.</p>}
            </div>
          </ItemListCard>

          <ItemListCard icon={TrendingUp} title="Investments" onSaved={refresh} createLabel="Add Investment">
            <p className="text-sm text-text-muted uppercase tracking-wide mb-2">Before income</p>
            <div className="flex flex-col divide-y divide-border mb-4">
              {investmentsPre.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
              {investmentsPre.length === 0 && <p className="text-text-muted text-base py-2">None yet.</p>}
            </div>
            <p className="text-sm text-text-muted uppercase tracking-wide mb-2">After income</p>
            <div className="flex flex-col divide-y divide-border">
              {investmentsPost.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
              {investmentsPost.length === 0 && <p className="text-text-muted text-base py-2">None yet.</p>}
            </div>
          </ItemListCard>
        </div>

        <ItemListCard icon={CreditCard} title="Expenses" onSaved={refresh} createLabel="Add Expense" className="lg:col-span-3" scrollHeight="h-[520px]">
          {expenseGroups.map((group) => (
            <div key={group.name} className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-text-primary text-base font-medium">{group.name}</p>
                <p className="text-base text-negative">{currency(group.total)}</p>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} categoryName={group.name} onDelete={handleDelete} onSaved={refresh} />
                ))}
              </div>
            </div>
          ))}
          {expenseGroups.length === 0 && <p className="text-text-muted text-base">None yet.</p>}
        </ItemListCard>
      </div>
    </div>
  )
}