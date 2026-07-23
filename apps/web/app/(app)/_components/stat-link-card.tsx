import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { CardSectionHeader } from '@/components/card-section-header'
import type { LucideIcon } from 'lucide-react'

export function StatLinkCard({
  icon,
  title,
  href,
  value,
  valueColor,
  caption,
  sparkline,
}: {
  icon: LucideIcon
  title: string
  href: string
  value: string
  valueColor?: string
  caption: React.ReactNode
  sparkline?: React.ReactNode
}) {
  return (
    <Link href={href} className="block group">
      <Card className="p-5 h-full transition-colors group-hover:border-accent/50">
        <CardContent className="p-0">
          <CardSectionHeader icon={icon} title={title} />
          <p className={`font-display text-3xl ${valueColor ?? 'text-text-primary'}`}>{value}</p>
          <p className="text-sm text-text-muted mt-2">{caption}</p>
          {sparkline && <div className="h-10 mt-3">{sparkline}</div>}
        </CardContent>
      </Card>
    </Link>
  )
}