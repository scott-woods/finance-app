// account-column.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AccountForm } from "./account-form"
import type { AccountType, AccountTypeGroup } from "@/types/accounts"
import { currency } from "@/lib/format"
import { AccountRow } from "./account-row"
import { ACCOUNT_TYPE_LABELS } from "@/lib/account-icons"

export function AccountColumn({
  title,
  groups,
  allowedTypes,
  isAsset,
  onSaved,
}: {
  title: string
  groups: AccountTypeGroup[]
  allowedTypes: AccountType[]
  isAsset: boolean
  onSaved: () => void
}) {
  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center justify-between p-0 mb-4">
        <h2 className="text-text-muted text-sm uppercase tracking-wide font-medium">{title}</h2>
        <AccountForm mode="create" allowedTypes={allowedTypes} isAsset={isAsset} onSaved={onSaved} />
      </CardHeader>

      <CardContent className="p-0">
        {groups.length === 0 ? (
          <p className="text-text-muted text-sm">None yet.</p>
        ) : (
          <ScrollArea className="h-[640px]">
            <div className="flex flex-col gap-5 pr-6">
              {groups.map((group) => (
                <div key={group.type}>
                  <div className="flex items-baseline justify-between mb-2">
                    <p className="text-text-primary text-sm font-medium">
                      {ACCOUNT_TYPE_LABELS[group.type]}
                    </p>
                    <p className={`text-sm ${isAsset ? 'text-positive' : 'text-negative'}`}>
                      {currency(group.subtotal)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {group.accounts.map((account) => (
                      <AccountRow
                        key={account.id}
                        account={account}
                        isAsset={isAsset}
                        onSaved={onSaved}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}