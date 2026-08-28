import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getProductBySlug } from '@/lib/data/products'

type Params = { params: Promise<{ slug: string }> }

// Mobile counterpart of app/store/product/[slug]/page.tsx's direct getProductBySlug() call —
// currently RSC-only, with no Server Action layer to wrap, so this reuses lib/data/products.ts's
// getProductBySlug directly and shapes the same public product fields that page already renders.
export async function GET(request: Request, { params }: Params) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const { slug } = await params
  const product = await getProductBySlug(tenant.id, slug)
  if (!product) return apiError('not_found', 'Product not found')

  return apiSuccess({
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: Number(product.price),
    comparePrice: product.comparePrice !== null ? Number(product.comparePrice) : null,
    category: product.category ? { id: product.category.id, name: product.category.name } : null,
    sizes: product.sizes,
    images: product.images,
    unit: product.unit,
    stockBySize: product.stockBySize,
    specifications: product.specifications,
    reviewCount: product.reviewCount,
    averageRating: product.averageRating,
  })
}
