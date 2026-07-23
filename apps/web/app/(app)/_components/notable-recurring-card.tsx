import Link from 'next/link'
import { Repeat, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import { currency } from '@/lib/format'
import { monthlyEquivalent } from '@/lib/recurring'
import type { components } from '@finance-app/api-spec'

type RecurringItem = components['schemas']['RecurringItem']

export function NotableRecurringCard({ items }: { items: RecurringItem[] }) {
  const topExpenses = items
    .filter((i) => i.kind === 'expense')
    .map((i) => ({ ...i, monthly: monthlyEquivalent(i.estimated_amount, i.frequency) }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 4)

  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <CardSectionHeader
          icon={Repeat}
          title="Largest Recurring Expenses"
          action={
            <Link href="/recurring" className="flex items-center gap-1 text-sm text-accent hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          }
        />
        {topExpenses.length === 0 ? (
          <p className="text-text-muted text-base">No recurring expenses yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {topExpenses.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3">
                <p className="text-text-primary text-base">{item.name}</p>
                <p className="text-negative text-base font-medium">{currency(item.monthly)}/mo</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}