import Link from 'next/link'
import { MapPin, CreditCard, Bell, User, ChevronRight, Pencil } from 'lucide-react'

// ponytail: hardcoded mock user until auth is wired
const user = {
  name: 'Priya Rajan',
  phone: '+91 98765 43210',
  email: 'priya.rajan@gmail.com',
  initial: 'P',
  stats: { orders: 8, wishlist: 12, totalSpent: '₹14.2K' },
}

const settingsNav = [
  { label: 'Addresses', desc: 'Manage saved addresses', href: '/account/addresses', icon: MapPin, tint: 'bg-pink-50 text-pink-500' },
  { label: 'Payment Method', desc: 'Cards, UPI & wallets', href: '/account/payment-method', icon: CreditCard, tint: 'bg-blue-50 text-blue-500' },
  { label: 'Notifications', desc: 'Deals, orders & promos', href: '/account/notifications', icon: Bell, tint: 'bg-amber-50 text-amber-500' },
  { label: 'Account', desc: 'Profile, logout & more', href: '/account/actions', icon: User, tint: 'bg-purple-50 text-purple-500' },
]

export default function AccountPage() {
  return (
    <>
      {/* ── Mobile hub ── */}
      <div className="lg:hidden min-h-screen bg-bg">
        <div className="px-5 pt-4 pb-3">
          <h1 className="font-heading text-2xl font-bold text-fg">Settings</h1>
        </div>

        {/* Profile card */}
        <div className="mx-4 rounded-2xl p-5 text-surface" style={{ background: 'linear-gradient(135deg, #2D1B3D 0%, #1A1025 100%)' }}>
          <div className="flex items-center gap-4 mb-5">
            <div className="flex size-14 items-center justify-center rounded-full bg-store-primary text-xl font-bold text-surface font-body">
              {user.initial}
            </div>
            <div className="flex-1">
              <div className="font-body text-base font-bold text-surface">{user.name}</div>
              <div className="font-body text-xs text-white/60">{user.phone}</div>
              <div className="font-body text-xs text-white/60">{user.email}</div>
            </div>
            <Link href="/account/profile" className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Pencil className="h-3.5 w-3.5 text-white" />
            </Link>
          </div>
          <div className="flex divide-x divide-white/20">
            <div className="flex-1 text-center">
              <div className="font-body text-lg font-bold text-store-primary">{user.stats.orders}</div>
              <div className="font-body text-[10px] text-white/50">Orders</div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-body text-lg font-bold text-store-primary">{user.stats.wishlist}</div>
              <div className="font-body text-[10px] text-white/50">Wishlist</div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-body text-lg font-bold text-store-primary">{user.stats.totalSpent}</div>
              <div className="font-body text-[10px] text-white/50">Total Spent</div>
            </div>
          </div>
        </div>

        {/* Nav list */}
        <div className="p-4 space-y-2">
          <h2 className="font-body text-xs font-bold text-muted-warm uppercase tracking-wider px-1 mb-1">Settings</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg transition-colors"
              >
                <span className={`flex size-9 items-center justify-center rounded-xl ${item.tint}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm font-semibold text-fg">{item.label}</div>
                  <div className="font-body text-xs text-muted-warm">{item.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-warm shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="py-6 text-center">
          <div className="mb-1 font-body text-xs text-muted-warm">
            Powered by <span className="font-semibold text-fg">talam</span>
          </div>
          <div className="font-body text-[10px] text-muted-warm">App version 1.0.0</div>
        </div>
      </div>

      {/* ── Desktop: redirect to first subpage ── */}
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
              {settingsNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex w-full items-center justify-between px-5 py-3.5 font-body text-md text-muted-warm hover:bg-bg border-l-[3px] border-transparent hover:border-store-primary transition-colors"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-xl font-bold text-fg">Settings</h1>
            <p className="font-body text-sm text-muted-warm mt-1 mb-6">Manage your addresses, payment methods, and preferences</p>
            <div className="rounded-xl border border-border bg-surface p-8 text-center">
              <p className="font-body text-sm text-muted-warm">Select a section from the sidebar to get started.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
