'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/recurring', label: 'Recurring' },
  { href: '/spending', label: 'Spending' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar p-4 flex flex-col justify-between">
        <nav className="flex flex-col gap-1">
          <h1 className="font-display text-2xl text-accent mb-6 px-2">Ledger</h1>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-md text-base transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent font-medium'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
        <UserButton />
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}