import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRequestTenantId } from '@/lib/data/tenant'
import { getOfferProducts } from '@/lib/data/products'
import { ProductGrid } from '@/components/store/product-grid'

export const metadata: Metadata = { title: 'Offers — Shop the Sale' }

export default async function OffersPage() {
  const tenantId = await getRequestTenantId()
  if (!tenantId) return notFound()

  const products = await getOfferProducts(tenantId)

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-16 sm:py-10">
      <h1 className="mb-2 font-heading text-xl font-bold text-fg sm:text-2xl">Offers</h1>
      <p className="mb-4 font-body text-sm text-muted-warm">
        {products.length} {products.length === 1 ? 'item' : 'items'} on sale
      </p>
      <ProductGrid products={products as any} />
    </main>
  )
}
