import createClient from 'openapi-fetch'
import type { paths } from '@finance-app/api-spec'

export function createApiClient(token: string | null) {
  return createClient<paths>({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
}