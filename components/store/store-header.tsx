import type { TenantStorefront } from '@/lib/data/tenant'
import { StoreLink, StoreIconButton } from './store-context'
import { CartBadge } from './cart-badge'
import { AccountMenu } from './account-menu'

type Props = {
  tenant: Pick<TenantStorefront, 'name' | 'logoUrl'>
}

export function StoreHeader({ tenant }: Props) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-surface/80 px-4 py-2.5 backdrop-blur-xl sm:border-b sm:border-border sm:bg-surface sm:px-12 sm:py-4 sm:backdrop-blur-none border-b border-border/50">
      <StoreLink href="/" className="font-heading text-xl font-bold text-fg sm:text-2xl">
        {tenant.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo, arbitrary remote host
          <img src={tenant.logoUrl} alt={tenant.name} className="h-8 object-contain sm:h-8" />
        ) : (
          tenant.name
        )}
      </StoreLink>

      <nav className="hidden gap-5 lg:flex lg:gap-12">
        <StoreLink href="/" className="font-body font-medium text-fg text-md/snug">
          Women
        </StoreLink>
        <StoreLink href="/" className="font-body font-medium text-fg text-md/snug">
          Men
        </StoreLink>
        <StoreLink href="/?occasion=Festive" className="font-body font-medium text-fg text-md/snug">
          Festive
        </StoreLink>
        <StoreLink href="/?sort=newest" className="font-body font-medium text-fg text-md/snug">
          New Arrivals
        </StoreLink>
        <StoreLink href="/about" className="font-body font-medium text-fg text-md/snug">
          About
        </StoreLink>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <StoreIconButton href="/">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#8B7D7A" strokeWidth="1.8" />
            <path d="m21 21-4.35-4.35" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </StoreIconButton>
        <StoreIconButton href="/wishlist">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </StoreIconButton>
        <CartBadge />
        <AccountMenu />
      </div>
    </header>
  )
}
