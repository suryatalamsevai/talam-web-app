import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getOrderTracking } from '@/lib/data/order-tracking'

/**
 * Net-new mobile endpoint — the web app shows tracking inside the RSC order page, so there is
 * no Server Action to convert here.
 *
 * Error contract: 400 when the tenant can't be resolved (auth is never attempted), 401 on a
 * missing/invalid/expired bearer token, 404 when the order doesn't exist or belongs to another
 * customer or tenant. Retry-safe/idempotent — a pure read.
 *
 * Upstream Shiprocket failures are deliberately NOT errors: if the courier lookup fails, times
 * out, or the order has no AWB yet, this still returns 200 with the stored AWB (if any) and the
 * order's own status, flagged `source: 'order_status'`. See lib/data/order-tracking.ts.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const { id } = await params
  const tracking = await getOrderTracking(tenant.id, user.id, id)
  if (!tracking) return apiError('not_found', 'Order not found')

  return apiSuccess(tracking)
}
