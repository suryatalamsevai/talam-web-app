import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { verifyRazorpayPayment } from '@/lib/checkout/verify-razorpay-payment'

/**
 * Mobile counterpart of app/checkout/actions.ts's verifyRazorpayPaymentAction, wrapping the
 * same lib/checkout/verify-razorpay-payment.ts function so both surfaces stay in lockstep.
 *
 * Payment-critical. Two differences from the web action, both deliberate:
 *  - No guest-cookie path. Ownership is always the bearer-authenticated user, so an
 *    unauthenticated caller can never reach the update.
 *  - An update that matches no row is reported as 404 `not_found` instead of a silent
 *    success, so a mobile client can't show a paid state for an order it doesn't own.
 *
 * Idempotent / retry-safe: a repeat call with the same verified payload re-asserts the same
 * terminal state and is a safe no-op. The Razorpay webhook stays the single source of truth
 * for payment state; this route is only the client-side confirmation path.
 */

type VerifyBody = {
  orderId?: unknown
  razorpayOrderId?: unknown
  razorpayPaymentId?: unknown
  signature?: unknown
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  let body: VerifyBody
  try {
    body = (await request.json()) as VerifyBody
  } catch {
    return apiError('invalid_request', 'Request body must be JSON')
  }

  const orderId = requiredString(body?.orderId)
  const razorpayOrderId = requiredString(body?.razorpayOrderId)
  const razorpayPaymentId = requiredString(body?.razorpayPaymentId)
  const signature = requiredString(body?.signature)
  if (!orderId || !razorpayOrderId || !razorpayPaymentId || !signature) {
    return apiError('invalid_request', 'orderId, razorpayOrderId, razorpayPaymentId and signature are required')
  }

  const result = await verifyRazorpayPayment({
    tenantId: tenant.id,
    customerId: user.id,
    orderId,
    razorpayOrderId,
    razorpayPaymentId,
    signature,
  })

  if (!result.ok) {
    // Signature didn't verify — nothing was written, and we don't say more than that.
    return apiError('unauthorized', 'Payment could not be verified.')
  }

  if (result.updated === 0) {
    return apiError('not_found', 'Order not found.')
  }

  return apiSuccess({ ok: true })
}
