import { withTenant } from '@/lib/prisma'
import type { Product } from '@prisma/client'

export type ProductFilters = {
  categoryId?: string // UUID — not a name string
  size?: string
  maxPrice?: number
}

export type CategoryMeta = { id: string; name: string; slug: string }

export async function getProducts(tenantId: string, filters?: ProductFilters): Promise<Product[]> {
  return withTenant(tenantId, (db) =>
    db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(filters?.categoryId ? { categoryId: filters.categoryId } : {}),
        ...(filters?.size ? { sizes: { has: filters.size } } : {}),
        ...(filters?.maxPrice ? { price: { lte: filters.maxPrice } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  )
}

export async function getProductBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.product.findFirst({
      where: { tenantId, slug, isActive: true },
      include: { category: { select: { id: true, name: true } } },
    })
  )
}

export async function getCategories(tenantId: string): Promise<CategoryMeta[]> {
  return withTenant(tenantId, (db) =>
    db.productCategory.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    })
  )
}
