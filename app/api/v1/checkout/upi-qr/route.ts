import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { computeUpiQr } from '@/lib/checkout/upi-qr'
import type { CartLine } from '@/lib/checkout/price-cart'

// Mobile counterpart of app/checkout/actions.ts's getUpiQrAction, wrapping the same
// lib/checkout/upi-qr.ts function so both surfaces stay in lockstep. Pure computation
// from tenant paymentConfig + the server-recomputed cart total — no DB writes, so this
// route is retry-safe/idempotent: calling it repeatedly with the same body has no side
// effects and always re-derives the same QR from current prices/stock/coupon state.
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  let body: { cart?: CartLine[]; couponCode?: string }
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request', 'Request body must be valid JSON')
  }

  const cart = body.cart
  if (!Array.isArray(cart)) {
    return apiError('invalid_request', 'Request body must include a cart')
  }

  const result = await computeUpiQr(tenant.id, cart, body.couponCode)
  if ('error' in result) return apiError('invalid_request', result.error)

  return apiSuccess(result)
}
