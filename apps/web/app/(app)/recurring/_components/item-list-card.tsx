import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CardSectionHeader } from '@/components/card-section-header'
import { RecurringItemForm } from './item-form'
import type { LucideIcon } from 'lucide-react'

export function ItemListCard({
  icon,
  title,
  createLabel,
  onSaved,
  className,
  scrollHeight,
  children,
}: {
  icon: LucideIcon
  title: string
  createLabel?: string
  onSaved: () => void
  className?: string
  scrollHeight?: string
  children: React.ReactNode
}) {
  return (
    <Card className={`p-5 ${className ?? ''}`}>
      <CardContent className="p-0">
        <CardSectionHeader
          icon={icon}
          title={title}
          action={<RecurringItemForm mode="create" createLabel={createLabel ?? `Add ${title}`} onSaved={onSaved} />}
        />
        {scrollHeight ? (
          <ScrollArea className={scrollHeight}>
            <div className="pr-4">{children}</div>
          </ScrollArea>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}