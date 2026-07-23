'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { createApiClient } from '@/lib/api'
import type { components } from '@finance-app/api-spec'

type NetWorthSummary = components['schemas']['NetWorthSummary']
type NetWorthTrendPoint = components['schemas']['NetWorthTrendPoint']

export function useNetWorth() {
  const { getToken } = useAuth()
  const [summary, setSummary] = useState<NetWorthSummary | null>(null)
  const [trend, setTrend] = useState<NetWorthTrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const [summaryRes, trendRes] = await Promise.all([
      client.GET('/net-worth/summary'),
      client.GET('/net-worth/trend'),
    ])
    if (!summaryRes.error) setSummary(summaryRes.data ?? null)
    if (!trendRes.error) setTrend(trendRes.data ?? [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { summary, trend, loading, refresh }
}