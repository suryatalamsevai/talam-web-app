import { withTenant } from '@/lib/prisma'

// Admin list — includes assigned product count, ordered for the settings page.
export async function listOccasions(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )
}

export async function getOccasionBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, slug } })
  )
}

// For the "assign products" picker — every active product plus whether it's already tagged.
export async function listProductsForOccasionPicker(tenantId: string, occasionId: string) {
  return withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        tagAssignments: { where: { tagId: occasionId }, select: { id: true } },
      },
    })
  )
}
