import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getEmptyCartSuggestions } from '@/lib/data/cart-suggestions'

// Mobile counterpart of app/store/cart/actions.ts's getEmptyCartSuggestions, wrapping the
// same lib/data/cart-suggestions.ts function so both surfaces stay in lockstep.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const suggestions = await getEmptyCartSuggestions(tenant.id, user.id)
  return apiSuccess(suggestions)
}
