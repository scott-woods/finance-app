import { Home, Car, CreditCard, Repeat, Utensils, Landmark, Wallet, TrendingUp, ArrowLeftRight, Circle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { components } from '@finance-app/api-spec'

type RecurringItemKind = components['schemas']['RecurringItemKind']

export const RECURRING_KIND_ICONS: Record<RecurringItemKind, LucideIcon> = {
  income: Wallet,
  investment_contribution: TrendingUp,
  expense: CreditCard,
  transfer: ArrowLeftRight,
}

// Best-effort match on category name. Falls back to the kind icon
// (or a generic circle) for any category not listed here — this map
// will need occasional upkeep as new categories get added.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Housing': Home,
  'Debt Payments': Landmark,
  'Subscriptions': Repeat,
  'Vehicle': Car,
  'Food': Utensils,
}

export function getRecurringItemIcon(categoryName: string | undefined, kind: RecurringItemKind): LucideIcon {
  if (categoryName && CATEGORY_ICONS[categoryName]) return CATEGORY_ICONS[categoryName]
  return RECURRING_KIND_ICONS[kind] ?? Circle
}