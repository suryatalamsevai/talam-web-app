import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getProducts, type ProductFilters, type ProductSort } from '@/lib/data/products'

const SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc', 'popular', 'discount-desc']

function parseFilters(url: URL): ProductFilters {
  const params = url.searchParams
  const sort = params.get('sort')
  const minPrice = params.get('minPrice')
  const maxPrice = params.get('maxPrice')

  return {
    categoryId: params.get('categoryId') ?? undefined,
    department: params.get('department') ?? undefined,
    offersOnly: params.get('offersOnly') === 'true' ? true : undefined,
    size: params.get('size') ?? undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    sort: sort && (SORTS as string[]).includes(sort) ? (sort as ProductSort) : undefined,
    tagId: params.get('tagId') ?? undefined,
  }
}

// Mobile counterpart of the storefront home/category pages' direct getProducts() calls
// (app/store/page.tsx, app/store/category/[categorySlug]/page.tsx) — currently RSC-only,
// with no Server Action layer to wrap, so this reuses lib/data/products.ts's getProducts
// directly and shapes the same public product fields those pages already pick for the client.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const filters = parseFilters(new URL(request.url))
  const products = await getProducts(tenant.id, filters)

  return apiSuccess(
    products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      price: Number(p.price),
      comparePrice: p.comparePrice !== null ? Number(p.comparePrice) : null,
      category: p.category?.name ?? null,
      sizes: p.sizes,
      images: p.images,
      unit: p.unit,
      reviewCount: p.reviewCount,
      averageRating: p.averageRating,
      isNew: p.isNew,
    }))
  )
}
