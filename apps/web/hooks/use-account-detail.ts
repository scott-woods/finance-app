'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { createApiClient } from '@/lib/api'
import type { components } from '@finance-app/api-spec'

type Account = components['schemas']['Account']
type AccountSnapshot = components['schemas']['AccountSnapshot']

export function useAccountDetail(accountId: number) {
  const { getToken } = useAuth()
  const [account, setAccount] = useState<Account | null>(null)
  const [snapshots, setSnapshots] = useState<AccountSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [accountRes, snapshotsRes] = await Promise.all([
      client.GET('/accounts/{id}', { params: { path: { id: accountId } } }),
      client.GET('/accounts/{id}/snapshots', { params: { path: { id: accountId } } }),
    ])
    if (!accountRes.error) setAccount(accountRes.data ?? null)
    if (!snapshotsRes.error) {
      const sorted = [...(snapshotsRes.data ?? [])].sort(
        (a, b) => new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
      )
      setSnapshots(sorted)
    }
    setLoading(false)
  }, [getToken, accountId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function deleteSnapshot(snapshotId: number) {
    const token = await getToken()
    const client = createApiClient(token)
    const res = await client.DELETE('/accounts/{id}/snapshots/{snapshotId}', {
      params: { path: { id: accountId, snapshotId } },
    })
    if (res.error) return { error: true }
    await refresh()
    return { error: false }
  }

  async function changeStatus(status: 'active' | 'closed' | 'hidden') {
    if (!account) return { error: true }
    const token = await getToken()
    const client = createApiClient(token)
    const res = await client.PUT('/accounts/{id}', {
      params: { path: { id: accountId } },
      body: {
        name: account.name,
        type: account.type,
        is_asset: account.is_asset,
        credit_limit: account.credit_limit ?? null,
        status,
      },
    })
    if (res.error) return { error: true }
    await refresh()
    return { error: false }
  }

  async function deleteAccount() {
    const token = await getToken()
    const client = createApiClient(token)
    const res = await client.DELETE('/accounts/{id}', { params: { path: { id: accountId } } })
    return { error: !!res.error }
  }

  return { account, snapshots, loading, refresh, deleteSnapshot, changeStatus, deleteAccount }
}