import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { priceCart, isError, toQuoteResult, type CartLine } from '@/lib/checkout/price-cart'

// Mobile counterpart of app/checkout/actions.ts's validateCouponAction, wrapping the same
// lib/checkout/price-cart.ts function so both surfaces stay in lockstep. Read-only — it never
// increments the coupon's usesCount (that only happens in placeOrderAction/POST orders), so
// this route is retry-safe/idempotent: calling it repeatedly with the same body has no side
// effects and always re-derives the same result from current prices/stock/coupon state.
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  let body: { code?: string; cart?: CartLine[] }
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request', 'Request body must be valid JSON')
  }

  const code = body.code
  const cart = body.cart
  if (typeof code !== 'string' || !code.trim() || !Array.isArray(cart)) {
    return apiError('invalid_request', 'Request body must include a coupon code and a cart')
  }

  const priced = await priceCart(tenant.id, cart, code)
  if (isError(priced)) return apiError('invalid_request', priced.error)

  return apiSuccess({ ...toQuoteResult(priced), code: priced.coupon?.code ?? code.trim().toUpperCase() })
}
