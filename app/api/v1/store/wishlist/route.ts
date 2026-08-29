import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { toggleWishlist } from '@/lib/data/wishlist'

// Mobile counterpart of app/store/wishlist/actions.ts's toggleWishlistAction, wrapping the
// same lib/data/wishlist.ts function so both surfaces stay in lockstep.
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const productId = body?.productId
  if (typeof productId !== 'string' || !productId) {
    return apiError('invalid_request', 'productId is required')
  }

  const saved = await toggleWishlist(tenant.id, user.id, productId)
  return apiSuccess({ saved })
}
