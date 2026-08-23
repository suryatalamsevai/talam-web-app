'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutDashboard, ClipboardList, Store, CreditCard, TrendingUp, Users, ChevronsLeft, ChevronsRight } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { ProfileMenu } from '@/components/marketing/profile-menu'

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard }

const OPERATIONS_NAV: NavItem[] = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/super-admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/super-admin/tenants', label: 'Tenants', icon: Store },
]

const PLATFORM_NAV: NavItem[] = [
  { href: '/super-admin/billing', label: 'Billing', icon: CreditCard },
  { href: '/super-admin/growth', label: 'Growth', icon: TrendingUp },
  { href: '/super-admin/staff', label: 'Staff', icon: Users },
]

const SIDEBAR_COLLAPSED_KEY = 'talam-super-admin-sidebar-collapsed'

// '/super-admin' only matches the Overview root exactly — every other item matches
// itself and its own sub-routes (e.g. '/super-admin/tenants/<id>' keeps Tenants active).
function isActive(pathname: string, href: string) {
  if (href === '/super-admin') return pathname === '/super-admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavGroup({ title, items, pathname, collapsed }: { title: string; items: NavItem[]; pathname: string; collapsed: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      {!collapsed && (
        <span className="px-4 pb-1 text-2xs font-semibold tracking-wide text-[#6B7280] uppercase">{title}</span>
      )}
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href)
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`text-md flex items-center gap-3 rounded-lg px-4 py-[10px] font-medium transition-colors ${
              active ? 'bg-brand-primary/15 text-brand-primary' : 'text-[#9CA3AF] hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon className="size-5 shrink-0" strokeWidth={1.8} />
            {!collapsed && <span>{label}</span>}
          </Link>
        )
      })}
    </div>
  )
}

export function SuperAdminNavShell({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  // Server has no access to localStorage, so the sidebar always renders expanded on
  // first paint and flips to the persisted state right after mount — same approach as
  // AdminNavShell, avoids a hydration mismatch.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1')
  }, [])

  useEffect(() => {
    contentRef.current?.scrollTo(0, 0)
  }, [pathname])

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="font-admin min-h-screen bg-bg">
      {/* Desktop: dark sidebar + light content, same split AdminNavShell uses for /admin. */}
      <div className="hidden md:flex">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col bg-bg-dark px-3 pt-4 transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-[232px]'}`}
        >
          <div className="mb-5 flex items-center justify-between px-1">
            {!collapsed && <span className="text-sm font-semibold text-white">talam ops</span>}
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-[#9CA3AF] transition-colors hover:bg-white/5 hover:text-white"
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </button>
          </div>
          <nav className="flex flex-col gap-5">
            <NavGroup title="Operations" items={OPERATIONS_NAV} pathname={pathname} collapsed={collapsed} />
            <NavGroup title="Platform" items={PLATFORM_NAV} pathname={pathname} collapsed={collapsed} />
          </nav>
        </aside>
        <div ref={contentRef} className="flex-1 overflow-auto">
          <header className="flex h-[64px] items-center justify-between border-b border-border bg-surface px-8">
            <span className="text-lg font-semibold text-fg">Talam Ops Console</span>
            <ProfileMenu
              user={user}
              triggerClassName="flex size-8 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-surface overflow-hidden hover:opacity-80 transition-opacity"
            />
          </header>
          <main className="p-8">{children}</main>
        </div>
      </div>

      {/* Mobile fallback — the design is desktop-only (no mobile artboards), so this keeps
          the console usable on a small screen without trying to invent a mobile layout. */}
      <div className="flex flex-col md:hidden">
        <header className="flex h-[56px] items-center justify-between border-b border-border bg-surface px-4">
          <span className="text-base font-semibold text-fg">Talam Ops</span>
          <ProfileMenu
            user={user}
            triggerClassName="flex size-8 items-center justify-center rounded-full bg-brand-primary text-xs font-semibold text-surface overflow-hidden"
          />
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2">
          {[...OPERATIONS_NAV, ...PLATFORM_NAV].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                isActive(pathname, href) ? 'bg-brand-primary/15 text-brand-primary' : 'text-muted-foreground'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="p-4">{children}</main>
      </div>
    </div>
  )
}
