'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createApiClient } from '@/lib/api'
import { ACCOUNT_TYPE_ICONS, ACCOUNT_TYPE_LABELS } from '@/lib/account-icons'
import type { components } from '@finance-app/api-spec'
import { AccountForm } from './account-form'

type Account = components['schemas']['Account']
type AccountType = components['schemas']['AccountType']

const ASSET_TYPES: AccountType[] = ['checking', 'savings', 'investment', 'real_estate', 'vehicle', 'other_asset']
const DEBT_TYPES: AccountType[] = ['credit_card', 'loan', 'other_debt']

export default function AccountsPage() {
  const { getToken } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const { data, error } = await client.GET('/accounts')
    if (!error) setAccounts(data ?? [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  if (loading) return <p className="text-text-muted">Loading...</p>

  const active = accounts.filter((a) => (a.status ?? 'active') === 'active')
  const assets = active.filter((a) => a.is_asset)
  const debts = active.filter((a) => !a.is_asset)

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h1 className="font-display text-3xl text-text-primary">Accounts</h1>
        <p className="text-text-muted mt-1">
          Everything you own and everything you owe, in one place.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <AccountSection title="Assets" accounts={assets} allowedTypes={ASSET_TYPES} isAsset={true} onSaved={refresh} />
        <AccountSection title="Debts" accounts={debts} allowedTypes={DEBT_TYPES} isAsset={false} onSaved={refresh} />
      </div>
    </div>
  )
}

function AccountSection({
  title,
  accounts,
  allowedTypes,
  isAsset,
  onSaved,
}: {
  title: string
  accounts: Account[]
  allowedTypes: AccountType[]
  isAsset: boolean
  onSaved: () => void
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-text-primary font-xl font-medium">{title}</h2>
        <AccountForm mode="create" allowedTypes={allowedTypes} isAsset={isAsset} onSaved={onSaved} />
      </div>
      {accounts.length === 0 ? (
        <p className="text-text-muted text-sm">None yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {accounts.map((account) => {
            const Icon = ACCOUNT_TYPE_ICONS[account.type]
            return (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="flex items-center gap-3 bg-background/60 border border-border rounded-lg p-3 hover:border-accent/50 transition-colors"
              >
                <div className="shrink-0 bg-accent/15 text-accent rounded-full p-2">
                  <Icon size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-text-primary text-base font-medium truncate">{account.name}</p>
                    <p className="text-sm text-text-muted">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CollapsedSection({ title, accounts }: { title: string; accounts: Account[] }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <h2 className="text-text-muted font-medium mb-3">
        {title} ({accounts.length})
      </h2>
      <div className="flex flex-col divide-y divide-border">
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}`}
            className="flex items-center justify-between py-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <span>{account.name}</span>
            <span className="text-sm">{account.type}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}