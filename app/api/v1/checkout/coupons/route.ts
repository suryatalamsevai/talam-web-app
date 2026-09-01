import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getAvailableCoupons } from '@/lib/data/checkout-coupons'

// Mobile counterpart of app/checkout/actions.ts's getAvailableCouponsAction, wrapping the
// same lib/data/checkout-coupons.ts function so both surfaces stay in lockstep. Read-only
// and retry-safe/idempotent.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const coupons = await getAvailableCoupons(tenant.id)
  return apiSuccess(coupons)
}
