import type { LucideIcon } from 'lucide-react'

export function CardSectionHeader({
  icon: Icon,
  title,
}: {
  icon: LucideIcon
  title: string
}) {
  return (
    <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-border">
      <Icon size={20} className="text-accent" />
      <p className="text-text-primary text-lg font-semibold uppercase tracking-wide">{title}</p>
    </div>
  )
}