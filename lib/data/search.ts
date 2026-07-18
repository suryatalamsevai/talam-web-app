import { withTenant } from '@/lib/prisma'

export async function searchProducts(tenantId: string, query: string, limit = 8) {
  if (!query.trim()) return []
  return withTenant(tenantId, async (db) => {
    const products = await db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        status: 'published',
        name: { contains: query.trim(), mode: 'insensitive' },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        comparePrice: true,
        images: true,
        category: { select: { name: true } },
      },
    })
    return products.map((p) => ({
      ...p,
      price: Number(p.price),
      comparePrice: p.comparePrice !== null ? Number(p.comparePrice) : null,
      categoryName: p.category?.name ?? null,
    }))
  })
}
