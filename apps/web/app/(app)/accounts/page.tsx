'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api'
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import type { components } from '@finance-app/api-spec'
import { AccountForm } from './account-form'
import { AddRecordForm } from './add-record-form'
import { Button } from '@/components/ui/button'

type AccountType = components['schemas']['AccountType']
type NetWorthSummary = components['schemas']['NetWorthSummary']
type AccountTypeGroup = components['schemas']['AccountTypeGroup']

const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'real_estate', 'vehicle', 'other_asset']
const DEBT_TYPES: AccountType[] = ['credit_card', 'loan', 'other_debt']

const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

export default function AccountsPage() {
  const { getToken } = useAuth()
  const [summary, setSummary] = useState<NetWorthSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const { data, error } = await client.GET('/net-worth/summary')
    if (!error) setSummary(data ?? null)
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading || !summary) return <p className="text-text-muted">Loading...</p>

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <p className="text-text-muted text-sm uppercase tracking-wide">Net Worth</p>
        <h1 className="font-display text-4xl text-text-primary mt-1">
          {currency(summary.net_worth)}
        </h1>
        <div className="flex gap-3 mt-3">
          <span className="text-sm text-positive bg-positive/10 rounded-full px-3 py-1">
            Assets: {currency(summary.total_assets)}
          </span>
          <span className="text-sm text-negative bg-negative/10 rounded-full px-3 py-1">
            Debts: {currency(summary.total_debts)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <AccountColumn
          title="Assets"
          groups={summary.asset_groups}
          allowedTypes={ASSET_TYPES}
          isAsset={true}
          onSaved={refresh}
        />
        <AccountColumn
          title="Debts"
          groups={summary.debt_groups}
          allowedTypes={DEBT_TYPES}
          isAsset={false}
          onSaved={refresh}
        />
      </div>
    </div>
  )
}

function AccountColumn({
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
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-muted text-sm uppercase tracking-wide font-medium">{title}</h2>
        <AccountForm mode="create" allowedTypes={allowedTypes} isAsset={isAsset} onSaved={onSaved} />
      </div>

      {groups.length === 0 ? (
        <p className="text-text-muted text-sm">None yet.</p>
      ) : (
        <div className="flex flex-col gap-5">
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
                {group.accounts.map((account) => {
                  const Icon = ACCOUNT_TYPE_ICONS[account.type]
                  return (
                    <div
                      key={account.id}
                      className="flex items-center gap-3 bg-background/60 border border-border rounded-lg p-3"
                    >
                      <div className="shrink-0 bg-accent/15 text-accent rounded-full p-2">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-text-primary text-base font-medium truncate">
                          {account.name}
                        </p>
                        <p className="text-sm text-text-muted">
                          {account.balance != null
                            ? `${currency(account.balance)} · ${new Date(account.as_of_date!).toLocaleDateString()}`
                            : 'No records yet'}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <AddRecordForm accountId={account.id} accountName={account.name} onSaved={onSaved} />
                        <Link href={`/accounts/${account.id}`}>
                          <Button variant="outline" size="sm">Details</Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}