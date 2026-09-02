import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { placeOrder, type CartLine, type PaymentProvider, type PlaceOrderInput } from '@/lib/data/checkout'

const PAYMENT_PROVIDERS: PaymentProvider[] = ['upi_manual', 'razorpay', 'cod']

const ADDRESS_STRING_FIELDS = ['name', 'phone', 'line1', 'city', 'state', 'pincode'] as const

function parseCart(value: unknown): CartLine[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const cart: CartLine[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') return null
    const line = entry as Record<string, unknown>
    if (typeof line.productId !== 'string' || !line.productId) return null
    if (!Number.isInteger(line.quantity) || (line.quantity as number) <= 0) return null
    if (line.size !== undefined && line.size !== null && typeof line.size !== 'string') return null
    cart.push({
      productId: line.productId,
      size: (line.size as string | null | undefined) ?? null,
      quantity: line.quantity as number,
    })
  }
  return cart
}

function parseAddress(value: unknown): PlaceOrderInput['address'] | null | 'invalid' {
  if (value === undefined || value === null) return null
  if (typeof value !== 'object') return 'invalid'
  const a = value as Record<string, unknown>
  for (const field of ADDRESS_STRING_FIELDS) {
    if (typeof a[field] !== 'string' || !a[field]) return 'invalid'
  }
  if (a.line2 !== undefined && typeof a.line2 !== 'string') return 'invalid'
  return {
    name: a.name as string,
    phone: a.phone as string,
    line1: a.line1 as string,
    line2: (a.line2 as string) ?? '',
    city: a.city as string,
    state: a.state as string,
    pincode: a.pincode as string,
  }
}

function parseInput(body: unknown): PlaceOrderInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  const cart = parseCart(b.cart)
  if (!cart) return null

  if (typeof b.paymentProvider !== 'string' || !PAYMENT_PROVIDERS.includes(b.paymentProvider as PaymentProvider)) return null
  if (typeof b.email !== 'string' || !b.email) return null

  for (const field of ['couponCode', 'addressId', 'utr', 'paymentProofUrl'] as const) {
    if (b[field] !== undefined && typeof b[field] !== 'string') return null
  }

  const address = parseAddress(b.address)
  if (address === 'invalid') return null

  return {
    cart,
    couponCode: b.couponCode as string | undefined,
    paymentProvider: b.paymentProvider as PaymentProvider,
    email: b.email,
    addressId: b.addressId as string | undefined,
    address: address ?? undefined,
    utr: b.utr as string | undefined,
    paymentProofUrl: b.paymentProofUrl as string | undefined,
  }
}

/**
 * Mobile counterpart of app/checkout/actions.ts's placeOrderAction, wrapping the same
 * lib/data/checkout.ts function so both surfaces stay in lockstep.
 *
 * Unlike the web action, this route never takes the guest path: it always hands `placeOrder`
 * the bearer-authenticated user. Guest checkout depends on an httpOnly ownership cookie set
 * on the response, and there is no cookie context for a mobile client to carry it.
 *
 * NOT IDEMPOTENT — see the shared `placeOrder` docs. A retried request creates a second
 * order for the same cart. Clients must retain the returned `orderId` and check the order's
 * status before resubmitting rather than blindly retrying on timeout.
 */
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return apiError('invalid_request', 'Invalid order payload')

  const result = await placeOrder(tenant.id, user, input)
  if ('error' in result) {
    // No conflict code exists in the shared envelope, so a lost stock race comes back as a
    // 400 invalid_request like every other rejected order; `details.reason` lets a client
    // tell it apart from a validation failure without parsing the human-readable message.
    return apiError('invalid_request', result.error, result.reason ? { details: { reason: result.reason } } : undefined)
  }

  return apiSuccess({ orderId: result.orderId }, 201)
}
