// account-row.tsx
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ACCOUNT_TYPE_ICONS } from "@/lib/account-icons"
import { currency } from "@/lib/format"
import { AddRecordForm } from "./add-record-form"
import { AccountBalance } from "@/types/accounts"

export function AccountRow({
  account,
  isAsset,
  onSaved,
}: {
  account: AccountBalance
  isAsset: boolean
  onSaved: () => void
}) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type]
  const balanceColor = isAsset ? 'text-positive' : 'text-negative'

  return (
    <div className="flex items-center gap-3 bg-background/60 border border-border rounded-lg p-3">
      <div className="shrink-0 bg-accent/15 text-accent rounded-full p-2">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-text-primary text-base font-medium truncate">
          {account.name}s
        </p>
        {account.balance != null ? (
          <p className="text-xs text-text-muted">
            {new Date(account.as_of_date!).toLocaleDateString()}
          </p>
        ) : (
          <p className="text-xs text-text-muted">No records yet</p>
        )}
      </div>
      {account.balance != null && (
        <p className={`text-lg font-semibold ${balanceColor} shrink-0`}>
          {currency(account.balance)}
        </p>
      )}
      <div className="flex gap-1 shrink-0">
        <AddRecordForm accountId={account.id} accountName={account.name} onSaved={onSaved} />
        <Link href={`/accounts/${account.id}`}>
          <Button variant="ghost" size="icon" className="text-text-muted hover:text-accent">
            <ArrowUpRight size={16} />
          </Button>
        </Link>
      </div>
    </div>
  )
}