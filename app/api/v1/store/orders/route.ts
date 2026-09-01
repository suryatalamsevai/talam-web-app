import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { listCustomerOrders } from '@/lib/data/storefront-orders'

// Mobile counterpart of the RSC page app/store/orders/page.tsx, wrapping the same
// lib/data/storefront-orders.ts function so both surfaces stay in lockstep. Net-new
// surface — there is no existing Server Action for this to leave unchanged.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const orders = await listCustomerOrders(tenant.id, user.id)
  return apiSuccess(orders)
}
