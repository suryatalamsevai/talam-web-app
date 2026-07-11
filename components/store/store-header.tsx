import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'
import { CartBadge } from './cart-badge'
import { AccountMenu } from './account-menu'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'logoUrl'>
}

function IconButton({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-border-light sm:size-10"
    >
      {children}
    </Link>
  )
}

export function StoreHeader({ tenant }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 sm:px-12 sm:py-4">
      <Link href="/" className="font-heading text-lg font-bold text-fg sm:text-2xl">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo, arbitrary remote host
          <img src={tenant.logoUrl} alt={tenant.name} className="h-7 object-contain sm:h-8" />
        ) : (
          tenant.name
        )}
      </Link>

      <nav className="hidden gap-5 lg:flex lg:gap-12">
        {/* ponytail: Women/Men have no product data dimension yet (no gender
            field on products) — link home unfiltered until schema supports
            it. Festive maps to the real `occasion` filter; New Arrivals maps
            to the Newest First sort. "Shop" is dropped since Home now serves
            that role. */}
        <Link href="/" className="font-body font-medium text-fg text-md/snug">
          Women
        </Link>
        <Link href="/" className="font-body font-medium text-fg text-md/snug">
          Men
        </Link>
        <Link href="/?occasion=Festive" className="font-body font-medium text-fg text-md/snug">
          Festive
        </Link>
        <Link href="/?sort=newest" className="font-body font-medium text-fg text-md/snug">
          New Arrivals
        </Link>
        <Link href="/about" className="font-body font-medium text-fg text-md/snug">
          About
        </Link>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <IconButton href="/">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#8B7D7A" strokeWidth="1.8" />
            <path d="m21 21-4.35-4.35" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </IconButton>
        <IconButton href="/wishlist">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
        <CartBadge />
        <AccountMenu />
      </div>
    </header>
  )
}
