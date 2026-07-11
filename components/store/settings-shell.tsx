'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { user } from '@/components/store/settings-sections'

const sidebarItems = [
  { label: 'Profile', href: '/account/profile' },
  { label: 'Addresses', href: '/account/addresses' },
  { label: 'Payments', href: '/account/payment-method' },
  { label: 'Notifications', href: '/account/notifications' },
  { label: 'Account', href: '/account/actions' },
]

export function SettingsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="hidden lg:block min-h-screen bg-bg py-10 px-12">
      <div className="mx-auto max-w-[1100px] flex gap-8">
        <div className="w-[280px] shrink-0">
          <div className="rounded-xl border border-border bg-surface p-6 mb-6">
            <div className="flex flex-col items-center">
              <div className="flex size-16 items-center justify-center rounded-full bg-store-primary/15 text-2xl font-bold text-store-primary font-body mb-3">
                {user.initial}
              </div>
              <div className="font-body text-base font-bold text-fg">{user.name}</div>
              <div className="font-body text-sm text-muted-warm">{user.phone}</div>
            </div>
          </div>
          <nav className="rounded-xl border border-border bg-surface overflow-hidden">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex w-full items-center justify-between px-5 py-3.5 font-body text-md transition-colors border-l-[3px] ${
                  pathname === item.href
                    ? 'text-fg font-semibold border-store-primary bg-bg'
                    : 'text-muted-warm border-transparent hover:bg-bg hover:border-store-primary'
                }`}
              >
                {item.label}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
