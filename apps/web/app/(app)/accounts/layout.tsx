import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/net-worth', label: 'Net Worth' },
  { href: '/recurring', label: 'Recurring' },
  { href: '/spending', label: 'Spending' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-sidebar p-4 flex flex-col justify-between">
        <nav className="flex flex-col gap-1">
          <h1 className="font-display text-lg text-accent mb-6 px-2">Ledger</h1>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-2 py-1.5 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <UserButton />
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}