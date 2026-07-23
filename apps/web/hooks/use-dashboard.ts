'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState, useCallback } from 'react'
import { createApiClient } from '@/lib/api'
import type { components } from '@finance-app/api-spec'

type SpendingSummary = components['schemas']['SpendingSummary']
type RecurringSummary = components['schemas']['RecurringSummary']
type RecurringItem = components['schemas']['RecurringItem']
type Transaction = components['schemas']['Transaction']

export function useDashboard() {
  const { getToken } = useAuth()
  const [spending, setSpending] = useState<SpendingSummary | null>(null)
  const [recurringSummary, setRecurringSummary] = useState<RecurringSummary | null>(null)
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = await getToken()
    const client = createApiClient(token)
    const now = new Date()
    const query = { year: now.getFullYear(), month: now.getMonth() + 1 }

    const [spendingRes, recurringSummaryRes, recurringItemsRes, txRes] = await Promise.all([
      client.GET('/spending/summary', { params: { query } }),
      client.GET('/recurring-items/summary'),
      client.GET('/recurring-items'),
      client.GET('/transactions', { params: { query } }),
    ])

    setSpending(spendingRes.data ?? null)
    setRecurringSummary(recurringSummaryRes.data ?? null)
    setRecurringItems(recurringItemsRes.data ?? [])

    const sorted = [...(txRes.data ?? [])].sort(
      (a, b) => new Date(b.posted_date).getTime() - new Date(a.posted_date).getTime()
    )
    setRecentTransactions(sorted.slice(0, 5))

    setLoading(false)
  }, [getToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { spending, recurringSummary, recurringItems, recentTransactions, loading, refresh }
}