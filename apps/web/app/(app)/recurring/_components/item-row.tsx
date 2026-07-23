import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { currency } from '@/lib/format'
import { getRecurringItemIcon } from '@/lib/recurring-icons'
import { RecurringItemForm } from './item-form'
import type { components } from '@finance-app/api-spec'

type RecurringItem = components['schemas']['RecurringItem']

export function ItemRow({
  item,
  categoryName,
  onDelete,
  onSaved,
}: {
  item: RecurringItem
  categoryName?: string
  onDelete: (id: number) => void
  onSaved: () => void
}) {
  const Icon = getRecurringItemIcon(categoryName, item.kind)
  const amountColor = item.kind === 'expense' ? 'text-negative' : 'text-positive'

  return (
    <div className="flex items-center gap-3 py-3">
      <div className="shrink-0 bg-accent/15 text-accent rounded-full p-2">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text-primary text-base">{item.name}</p>
        <p className="text-sm text-text-muted capitalize">{item.frequency}</p>
      </div>
      <p className={`text-base font-medium ${amountColor} shrink-0`}>{currency(item.estimated_amount)}</p>
      <div className="flex items-center gap-1 shrink-0">
        <RecurringItemForm mode="edit" trigger="icon" item={item} onSaved={onSaved} />
        <Button variant="ghost" size="icon" className="text-text-muted hover:text-negative" onClick={() => onDelete(item.id)}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  )
}