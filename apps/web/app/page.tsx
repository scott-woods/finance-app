'use client'

import { Show, SignInButton, UserButton, useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import { createApiClient } from '@/lib/api'

export default function Home() {
  const { getToken, isSignedIn } = useAuth()
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    if (!isSignedIn) return

    async function fetchAccounts() {
      const token = await getToken()
      const client = createApiClient(token)
      const { data, error } = await client.GET('/accounts')
      if (error) {
        console.error(error)
        return
      }
      setAccounts(data ?? [])
    }

    fetchAccounts()
  }, [isSignedIn, getToken])

  return (
    <main style={{ padding: '2rem' }}>
      <Show when="signed-out">
        <SignInButton mode="modal" />
      </Show>
      <Show when="signed-in">
        <UserButton />
        <h2>Accounts</h2>
        <ul>
          {accounts.map((a) => (
            <li key={a.id}>
              {a.name} — {a.type}
            </li>
          ))}
        </ul>
      </Show>
    </main>
  )
}