import Link from 'next/link'
import { Receipt, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import { currency } from '@/lib/format'
import { useCategories } from '@/hooks/use-categories'
import type { components } from '@finance-app/api-spec'

type Transaction = components['schemas']['Transaction']

export function RecentTransactionsCard({ transactions }: { transactions: Transaction[] }) {
  const categories = useCategories()

  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <CardSectionHeader
          icon={Receipt}
          title="Recent Transactions"
          action={
            <Link href="/spending" className="flex items-center gap-1 text-sm text-accent hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          }
        />
        {transactions.length === 0 ? (
          <p className="text-text-muted text-base">No transactions yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {transactions.map((tx) => {
              const category = categories.find((c) => c.id === tx.category_id)
              return (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-text-primary text-base">{tx.description || category?.name || 'Transaction'}</p>
                    <p className="text-sm text-text-muted">
                      {new Date(tx.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {category && ` · ${category.name}`}
                    </p>
                  </div>
                  <p className="text-negative text-base font-medium">{currency(tx.amount)}</p>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}