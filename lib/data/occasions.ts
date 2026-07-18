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
    db.productTag.findFirst({ where: { tenantId, slug, status: 'published' } })
  )
}

// For the "assign products" picker — every active product plus whether it's already tagged.
export async function listProductsForOccasionPicker(tenantId: string, occasionId: string) {
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        tagAssignments: { where: { tagId: occasionId }, select: { id: true, sortOrder: true } },
      },
    })
  )

  // Assigned products first, in their saved order; unassigned products after, alphabetically.
  const assigned = products
    .filter((p) => p.tagAssignments.length > 0)
    .sort((a, b) => a.tagAssignments[0].sortOrder - b.tagAssignments[0].sortOrder)
  const unassigned = products.filter((p) => p.tagAssignments.length === 0)
  return [...assigned, ...unassigned]
}

export async function updateOccasionSettings(
  tenantId: string,
  occasionId: string,
  input: { themeKey?: string; layout?: 'grid' | 'carousel' }
) {
  return withTenant(tenantId, (db) =>
    db.productTag.update({
      where: { id: occasionId, tenantId },
      data: {
        ...(input.themeKey !== undefined ? { themeKey: input.themeKey } : {}),
        ...(input.layout !== undefined ? { layout: input.layout } : {}),
      },
    })
  )
}
