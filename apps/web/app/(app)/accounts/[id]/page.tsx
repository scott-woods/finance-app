'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useAccountDetail } from '@/hooks/use-account-detail'
import { ASSET_TYPES, DEBT_TYPES } from '@/types/accounts'
import { Skeleton } from '@/components/ui/skeleton'
import { AccountHeader } from './_components/account-header'
import { ValueOverTimeCard } from './_components/value-over-time-card'
import { AccountDetailsPanel } from './_components/account-details-panel'
import { AllRecordsCard } from './_components/all-records-card'

export default function AccountDetailPage() {
  const params = useParams()
  const router = useRouter()
  const accountId = Number(params.id)

  const { account, snapshots, loading, refresh, deleteSnapshot, changeStatus, deleteAccount } =
    useAccountDetail(accountId)

  if (loading || !account) {
    return <Skeleton className="h-64 w-full rounded-xl" />
  }

  async function handleDeleteAccount() {
    const { error } = await deleteAccount()
    if (error) return // TODO: surface a toast/error message
    router.push('/accounts')
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/accounts" className="flex items-center gap-1 text-text-muted hover:text-text-primary text-sm w-fit">
        <ArrowLeft size={14} /> Back
      </Link>

      <AccountHeader account={account} snapshots={snapshots} onSaved={refresh} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ValueOverTimeCard snapshots={snapshots} />
        <AccountDetailsPanel
          account={account}
          snapshots={snapshots}
          onSaved={refresh}
          onChangeStatus={changeStatus}
          onDeleteAccount={handleDeleteAccount}
          allowedTypes={account.is_asset ? ASSET_TYPES : DEBT_TYPES}
        />
      </div>

      <AllRecordsCard
        account={account}
        snapshots={snapshots}
        onSaved={refresh}
        onDeleteSnapshot={deleteSnapshot}
      />
    </div>
  )
}