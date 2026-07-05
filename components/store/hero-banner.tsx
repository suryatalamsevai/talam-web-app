import Link from 'next/link'
import type { TenantStorefront } from '@/lib/data/tenant'

type Props = {
  tenant: Pick<TenantStorefront, 'tagline'>
}

export function HeroBanner({ tenant }: Props) {
  return (
    <section
      className="relative overflow-hidden px-5 py-10 sm:flex sm:h-[420px] sm:items-center sm:gap-15 sm:px-12 sm:py-15"
      style={{ backgroundImage: 'linear-gradient(135deg, #241429 0%, #221542 100%)' }}
    >
      <div className="absolute -top-10 -right-10 size-[180px] rounded-full bg-[#FFD70014] sm:size-[360px]" />
      <div className="relative flex flex-col gap-4 sm:grow sm:gap-6">
        <span className="font-body text-xs font-bold tracking-wide text-amber uppercase sm:text-sm">
          Curated for You
        </span>
        <h1 className="font-heading text-[36px] leading-[120%] font-bold text-surface sm:text-[56px]">
          Discover Timeless Elegance
        </h1>
        <p className="max-w-[480px] font-body text-base leading-[160%] text-border">
          {tenant.tagline ?? 'Handpicked ethnic wear, artisan crafts, and modern designs. Direct from makers you can trust.'}
        </p>
        <Link
          href="/shop"
          className="self-start rounded-lg bg-store-primary px-6 py-3 font-body text-md font-semibold leading-snug text-surface sm:px-8 sm:py-3.5 sm:text-[15px]"
        >
          Explore Collection
        </Link>
      </div>
      <div
        className="hidden h-[300px] shrink-0 basis-[40%] rounded-xl sm:block"
        style={{ backgroundImage: 'linear-gradient(135deg, rgba(232,87,126,0.15) 0%, rgba(200,60,90,0.1) 100%)' }}
      />
    </section>
  )
}
