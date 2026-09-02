import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getProductTags } from '@/lib/data/storefront'

// Mobile counterpart of the storefront home page's direct getProductTags() call
// (app/store/page.tsx's "Shop by occasion" section) — currently RSC-only, with no
// Server Action layer to wrap, so this reuses lib/data/storefront.ts's getProductTags
// directly and shapes the same fields that page already picks for its client.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const tags = await getProductTags(tenant.id)

  return apiSuccess(
    tags.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      emoji: t.emoji,
      productCount: t._count.products,
    }))
  )
}
