import type { LucideIcon } from 'lucide-react'

// card-section-header.tsx (extended)
export function CardSectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon
  title: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between pb-4 mb-5 border-b border-border">
      <div className="flex items-center gap-2.5">
        <Icon size={20} className="text-accent" />
        <p className="text-text-primary text-lg font-semibold uppercase tracking-wide">{title}</p>
      </div>
      {action}
    </div>
  )
}