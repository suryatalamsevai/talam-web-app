import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { priceCart, isError, toQuoteResult, type CartLine } from '@/lib/data/checkout-quote'

// Mobile counterpart of app/checkout/actions.ts's getQuoteAction, wrapping the same
// lib/data/checkout-quote.ts's priceCart/toQuoteResult so both surfaces stay in lockstep.
//
// Read-only pricing calculation — no writes, so this is idempotent/retry-safe: calling it
// twice with the same body re-derives the same totals from the DB and has no side effects.
//
// pincode/paymentMethod are accepted in the body for forward compatibility with clients but
// are not currently used by pricing (getQuoteAction doesn't use them either).
type QuoteRequestBody = {
  cart: CartLine[]
  couponCode?: string
  pincode?: string
  paymentMethod?: string
}

export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  let body: QuoteRequestBody
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request', 'Request body must be valid JSON')
  }

  if (!Array.isArray(body.cart)) {
    return apiError('invalid_request', 'cart is required and must be an array')
  }

  const priced = await priceCart(tenant.id, body.cart, body.couponCode)
  if (isError(priced)) return apiError('invalid_request', priced.error)

  return apiSuccess(toQuoteResult(priced))
}
