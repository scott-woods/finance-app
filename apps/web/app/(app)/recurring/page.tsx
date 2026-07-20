'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { Trash2 } from 'lucide-react'
import { createApiClient } from '@/lib/api'
import { useCategories } from '@/lib/use-categories'
import { Button } from '@/components/ui/button'
import type { components } from '@finance-app/api-spec'
import { RecurringItemForm } from './item-form'

type RecurringItem = components['schemas']['RecurringItem']
type RecurringSummary = components['schemas']['RecurringSummary']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

const monthlyEquivalent = (amount: number, freq: string) => {
  switch (freq) {
    case 'weekly': return amount * 4.33
    case 'biweekly': return amount * 2.17
    case 'annual': return amount / 12
    default: return amount
  }
}

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
    await client.DELETE('/recurring-items/{id}', { params: { path: { id } } })
    refresh()
  }

  if (loading || !summary) return <p className="text-text-muted">Loading...</p>

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
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-text-muted text-sm uppercase tracking-wide">Disposable Income</p>
        <h1 className="font-display text-4xl text-text-primary mt-1 mb-4">
          {currency(summary.disposable_income)}
        </h1>
        <div className="flex h-2.5 rounded-full overflow-hidden mb-2">
          <div className="bg-negative" style={{ width: `${expensePct}%` }} />
          <div className="bg-positive" style={{ width: `${investPct}%` }} />
          <div className="bg-accent" style={{ width: `${disposablePct}%` }} />
        </div>
        <div className="flex gap-4 text-sm text-text-muted">
          <span><span className="text-negative">●</span> Expenses {expensePct.toFixed(0)}%</span>
          <span><span className="text-positive">●</span> Investments {investPct.toFixed(0)}%</span>
          <span><span className="text-accent">●</span> Disposable {disposablePct.toFixed(0)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Income</p>
          <p className="font-display text-2xl text-text-primary">{currency(summary.total_income)}</p>
          <p className="text-xs text-text-muted mt-2">Take-home, post-tax</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Investments</p>
          <p className="font-display text-2xl text-positive">
            {currency(summary.total_investments_pre_tax + summary.total_investments_post_tax)}
          </p>
          <p className="text-xs text-text-muted mt-2">Before income {currency(summary.total_investments_pre_tax)}</p>
          <p className="text-xs text-text-muted">After income {currency(summary.total_investments_post_tax)}</p>
          <p className="text-xs text-positive mt-2">
            Savings rate {summary.savings_rate.toFixed(1)}% of effective income
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-text-muted text-sm uppercase tracking-wide mb-2">Expenses</p>
          <p className="font-display text-2xl text-negative">{currency(summary.total_expenses)}</p>
          <p className="text-xs text-text-muted mt-2">Monthly, annual amortized in</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 items-start">
        <div className="col-span-2 flex flex-col gap-6">
          <ItemListCard title="Income" onSaved={refresh}>
            <div className="flex flex-col divide-y divide-border">
              {income.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
            </div>
          </ItemListCard>

          <ItemListCard title="Investments" onSaved={refresh}>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">Before income</p>
            <div className="flex flex-col divide-y divide-border mb-4">
              {investmentsPre.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
              {investmentsPre.length === 0 && <p className="text-text-muted text-sm py-2">None yet.</p>}
            </div>
            <p className="text-xs text-text-muted uppercase tracking-wide mb-2">After income</p>
            <div className="flex flex-col divide-y divide-border">
              {investmentsPost.map((item) => (
                <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} />
              ))}
              {investmentsPost.length === 0 && <p className="text-text-muted text-sm py-2">None yet.</p>}
            </div>
          </ItemListCard>
        </div>

        <ItemListCard title="Expenses" onSaved={refresh} className="col-span-3">
          {expenseGroups.map((group) => (
            <div key={group.name} className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-text-primary text-sm font-medium">{group.name}</p>
                <p className="text-sm text-negative">{currency(group.total)}</p>
              </div>
              <div className="flex flex-col divide-y divide-border">
                {group.items.map((item) => (
                  <ItemRow key={item.id} item={item} onDelete={handleDelete} onSaved={refresh} showFrequency />
                ))}
              </div>
            </div>
          ))}
          {expenseGroups.length === 0 && <p className="text-text-muted text-sm">None yet.</p>}
        </ItemListCard>
      </div>
    </div>
  )
}

function ItemListCard({
  title,
  children,
  onSaved,
  className,
}: {
  title: string
  children: React.ReactNode
  onSaved: () => void
  className?: string
}) {
  return (
    <div className={`bg-card border border-border rounded-xl p-5 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-muted text-sm uppercase tracking-wide font-medium">{title}</h2>
        <RecurringItemForm mode="create" onSaved={onSaved} />
      </div>
      <div className="max-h-[520px] overflow-y-auto">{children}</div>
    </div>
  )
}

function ItemRow({
  item,
  onDelete,
  onSaved,
  showFrequency,
}: {
  item: RecurringItem
  onDelete: (id: number) => void
  onSaved: () => void
  showFrequency?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div>
        <p className="text-text-primary text-sm">{item.name}</p>
        {showFrequency && <p className="text-xs text-text-muted capitalize">{item.frequency}</p>}
      </div>
      <div className="flex items-center gap-2">
        <p className="text-text-primary text-sm font-medium">{currency(item.estimated_amount)}</p>
        <RecurringItemForm mode="edit" item={item} onSaved={onSaved} />
        <Button variant="ghost" size="icon" className="text-text-muted hover:text-negative" onClick={() => onDelete(item.id)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  )
}