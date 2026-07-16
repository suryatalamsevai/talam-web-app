import { MapPin, CreditCard, Bell, User, ChevronRight, Pencil } from 'lucide-react'
import { StoreLink } from '@/components/store/store-context'

// ponytail: hardcoded mock user until auth is wired
const user = {
  name: 'Priya Rajan',
  phone: '+91 98765 43210',
  email: 'priya.rajan@gmail.com',
  initial: 'P',
  stats: { orders: 8, wishlist: 12, totalSpent: '₹14.2K' },
}

const settingsNav = [
  { label: 'Addresses', desc: 'Manage saved addresses', href: '/account/addresses', icon: MapPin, tint: 'bg-pink-100 text-pink-600' },
  { label: 'Payment Method', desc: 'Cards, UPI & wallets', href: '/account/payment-method', icon: CreditCard, tint: 'bg-blue-100 text-blue-600' },
  { label: 'Notifications', desc: 'Deals, orders & promos', href: '/account/notifications', icon: Bell, tint: 'bg-amber-100 text-amber-600' },
  { label: 'Account', desc: 'Profile, logout & more', href: '/account/actions', icon: User, tint: 'bg-purple-100 text-purple-600' },
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
        <div
          className="relative mx-4 overflow-hidden rounded-2xl p-5 text-surface"
          style={{
            background:
              'radial-gradient(circle at 15% 0%, rgba(168,85,247,0.35), transparent 55%), linear-gradient(135deg, #3B1F5C 0%, #1B0F2E 55%, #0E0817 100%)',
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative flex items-center gap-4 mb-5">
            <div className="flex size-14 items-center justify-center rounded-full bg-store-primary text-xl font-bold text-surface font-body">
              {user.initial}
            </div>
            <div className="flex-1">
              <div className="font-body text-base font-bold text-surface">{user.name}</div>
              <div className="font-body text-xs text-white/60">{user.phone}</div>
              <div className="font-body text-xs text-white/60">{user.email}</div>
            </div>
            <StoreLink href="/account/profile" className="flex size-8 items-center justify-center rounded-lg bg-white/10">
              <Pencil className="h-3.5 w-3.5 text-white" />
            </StoreLink>
          </div>
          <div className="relative flex divide-x divide-white/15">
            <div className="flex-1 text-center">
              <div className="font-body text-2xl font-bold text-store-primary">{user.stats.orders}</div>
              <div className="font-body text-[10px] text-white/50 mt-0.5">Orders</div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-body text-2xl font-bold text-store-primary">{user.stats.wishlist}</div>
              <div className="font-body text-[10px] text-white/50 mt-0.5">Wishlist</div>
            </div>
            <div className="flex-1 text-center">
              <div className="font-body text-2xl font-bold text-store-primary">{user.stats.totalSpent}</div>
              <div className="font-body text-[10px] text-white/50 mt-0.5">Total Spent</div>
            </div>
          </div>
        </div>

        {/* Nav list */}
        <div className="p-4 space-y-2">
          <h2 className="font-body text-xs font-bold text-muted-warm uppercase tracking-wider px-1 mb-1">Settings</h2>
          <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
            {settingsNav.map((item) => (
              <StoreLink
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-3.5 hover:bg-bg active:scale-[0.98] transition-all"
              >
                <span className={`flex size-10 items-center justify-center rounded-xl ${item.tint}`}>
                  <item.icon className="h-[18px] w-[18px]" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-body text-sm font-semibold text-fg">{item.label}</div>
                  <div className="font-body text-xs text-muted-warm">{item.desc}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-warm shrink-0" />
              </StoreLink>
            ))}
          </div>
        </div>

        <div className="pt-10 pb-6 text-center">
          <div className="mb-1 font-body text-[11px] text-muted-warm">
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
                <StoreLink
                  key={item.href}
                  href={item.href}
                  className="flex w-full items-center justify-between px-5 py-3.5 font-body text-md text-muted-warm hover:bg-gradient-to-r hover:from-store-primary/10 hover:to-transparent border-l-[3px] border-transparent hover:border-store-primary transition-all"
                >
                  {item.label}
                  <ChevronRight className="h-4 w-4" />
                </StoreLink>
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
