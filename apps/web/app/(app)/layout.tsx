'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import { LayoutDashboard, Wallet, Repeat, PieChart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Wallet },
  { href: '/recurring', label: 'Recurring', icon: Repeat },
  { href: '/spending', label: 'Spending', icon: PieChart },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar p-4 flex flex-col justify-between">
        <nav className="flex flex-col gap-1">
          <div className="mb-6 px-2">
            <h1 className="font-display text-2xl text-accent">Solvent</h1>
            <p className="text-xs text-sidebar-foreground/60 uppercase tracking-widest mt-0.5">
              Personal Finance
            </p>
            <div
              className="h-px mt-3 w-full"
              style={{ background: 'linear-gradient(to right, var(--color-accent), transparent)' }}
            />
          </div>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-base border-l-2 transition-colors ${
                  isActive
                    ? 'bg-accent/15 text-accent font-medium border-accent'
                    : 'text-sidebar-foreground border-transparent hover:bg-sidebar-accent'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="pt-4 border-t border-border">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}