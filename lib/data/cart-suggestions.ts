import { withTenant } from '@/lib/prisma'

export type SuggestedProduct = {
  name: string
  slug: string
  price: number
  comparePrice: number | null
  image: string | null
}

/**
 * Shared by the storefront's empty-cart Server Action and the mobile API route. `customerId`
 * is `null` for anonymous shoppers (the web cart is browsable without sign-in), in which case
 * this skips straight to the trending fallback.
 */
export async function getEmptyCartSuggestions(
  tenantId: string,
  customerId: string | null
): Promise<{ source: string; items: SuggestedProduct[] }> {
  // Try wishlist first
  if (customerId) {
    const wishlistItems = await withTenant(tenantId, (db) =>
      db.wishlist.findMany({
        where: { tenantId, customerId },
        take: 4,
        select: {
          product: { select: { name: true, slug: true, price: true, comparePrice: true, images: true } },
        },
      })
    )
    if (wishlistItems.length > 0) {
      return {
        source: 'saved',
        items: wishlistItems.map((w) => ({
          name: w.product.name,
          slug: w.product.slug,
          price: Number(w.product.price),
          comparePrice: w.product.comparePrice ? Number(w.product.comparePrice) : null,
          image: w.product.images[0] ?? null,
        })),
      }
    }
  }

  // Fallback: trending (most ordered recently)
  const trending = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { name: true, slug: true, price: true, comparePrice: true, images: true },
    })
  )

  return {
    source: 'trending',
    items: trending.map((p) => ({
      name: p.name,
      slug: p.slug,
      price: Number(p.price),
      comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
      image: p.images[0] ?? null,
    })),
  }
}
