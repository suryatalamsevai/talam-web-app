import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getCustomerOrder } from '@/lib/data/storefront-orders'

// Mobile counterpart of app/store/orders/[id]/page.tsx, wrapping the same
// lib/data/storefront-orders.ts function so both surfaces stay in lockstep.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const { id } = await params
  const order = await getCustomerOrder(tenant.id, user.id, id)
  // getCustomerOrder scopes by customerId as well as tenantId, so an order that exists but
  // belongs to a different customer returns null here too — a guessed order id must not
  // leak someone else's order.
  if (!order) return apiError('not_found', 'Order not found')

  return apiSuccess(order)
}
