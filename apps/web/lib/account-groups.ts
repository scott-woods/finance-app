import type { components } from '@finance-app/api-spec'

type AccountTypeGroup = components['schemas']['AccountTypeGroup']

export function sortGroups(groups: AccountTypeGroup[]): AccountTypeGroup[] {
  return [...groups]
    .sort((a, b) => b.subtotal - a.subtotal)
    .map((g) => ({
      ...g,
      accounts: [...g.accounts].sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0)),
    }))
}