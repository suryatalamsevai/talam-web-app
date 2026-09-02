import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createRazorpayOrderForOrder } from '@/lib/payments/razorpay-order'

/**
 * Mobile counterpart of app/checkout/actions.ts's createRazorpayOrderAction, wrapping the
 * same lib/payments/razorpay-order.ts function so both surfaces stay in lockstep.
 *
 * Ownership: there is no guest-order cookie here — the bearer token's user id IS the
 * customer id, and the shared function only returns an order matching tenant + customer,
 * so a token for tenant A can never mint a Razorpay order against tenant B's order.
 *
 * NOT retry-safe / not idempotent: each call mints a new Razorpay order and overwrites the
 * order's stored paymentId, invalidating any razorpayOrderId handed out by a previous call.
 * See the note in lib/payments/razorpay-order.ts — final payment state is still settled by
 * the webhook's paymentStatus:'pending' guard, not by this route.
 */
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const orderId = (body as { orderId?: unknown } | null)?.orderId
  if (typeof orderId !== 'string' || !orderId) {
    return apiError('invalid_request', 'orderId is required')
  }

  const result = await createRazorpayOrderForOrder({ tenantId: tenant.id, customerId: user.id, orderId })
  if ('error' in result) {
    if (result.reason === 'payments_unavailable') return apiError('internal_error', result.error)
    return apiError('not_found', result.error)
  }

  return apiSuccess(result)
}
