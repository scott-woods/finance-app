'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api'
import type { components } from '@finance-app/api-spec'

type Category = components['schemas']['Category']

export function useCategories() {
  const { getToken } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const client = createApiClient(token)
      const { data } = await client.GET('/categories')
      setCategories(data ?? [])
    }
    load()
  }, [getToken])

  return categories
}