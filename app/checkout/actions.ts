'use server'

import { cookies } from 'next/headers'
import { requireTenant } from '@/lib/auth-guard'
import { createServerClient } from '@/lib/supabase/server'
import { cookieDomain } from '@/lib/supabase/cookie-domain'
import { uploadPaymentProof } from '@/lib/checkout/payment-proof'
import { getAvailableCoupons, type AvailableCoupon } from '@/lib/data/checkout-coupons'
import { getRazorpayKeys, verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { createRazorpayOrderForOrder } from '@/lib/payments/razorpay-order'
import { verifyRazorpayPayment } from '@/lib/checkout/verify-razorpay-payment'
import {
  priceCart,
  isError,
  toQuoteResult,
  type CartLine,
  type PricingContext,
  type QuotedLine,
  type QuoteResult,
} from '@/lib/checkout/price-cart'
import { computeUpiQr } from '@/lib/checkout/upi-qr'
import { placeOrder } from '@/lib/data/checkout'

// Proves, for the two Razorpay follow-up actions below, that THIS browser is the one that
// just placed a given guest order — without it, "no session" would mean "no ownership check
// at all" and any anonymous visitor could act on any order in the tenant by simply not
// signing in. Scoped to the single most recent guest order, which is all one checkout needs.
const GUEST_ORDER_COOKIE = 'guest_order_auth'

async function setGuestOrderCookie(orderId: string, customerId: string) {
  const store = await cookies()
  store.set(GUEST_ORDER_COOKIE, `${orderId}:${customerId}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
    domain: cookieDomain(),
  })
}

/** Returns the guest customerId authorized for `orderId` by this browser's cookie, or null. */
async function readGuestOrderCustomerId(orderId: string): Promise<string | null> {
  const store = await cookies()
  const [cookieOrderId, customerId] = (store.get(GUEST_ORDER_COOKIE)?.value ?? '').split(':')
  return cookieOrderId === orderId && customerId ? customerId : null
}

// Re-exported so existing call sites (e.g. app/checkout/checkout-client.tsx) importing
// these types from this module keep working unchanged.
export type { CartLine, PricingContext, QuotedLine, QuoteResult }

export type PaymentProvider = 'upi_manual' | 'razorpay' | 'cod'

/**
 * Everything below re-reads prices, stock and coupons from the database (via
 * `priceCart` in lib/checkout/price-cart.ts). The client sends product ids, sizes
 * and quantities only — any total it computed is for display.
 */

/** Server-authoritative totals for display — the client never decides what anything costs. */
export async function getQuoteAction(cart: CartLine[], couponCode?: string): Promise<QuoteResult | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, couponCode)
  return isError(priced) ? priced : toQuoteResult(priced)
}

/** Active, unexpired, not-yet-exhausted codes to promote near the coupon field — not a
 *  substitute for validateCouponAction, which re-checks everything (incl. minOrder) at apply time. */
export async function getAvailableCouponsAction(): Promise<AvailableCoupon[]> {
  const { tenantId } = await requireTenant()
  return getAvailableCoupons(tenantId)
}

export async function validateCouponAction(
  code: string,
  cart: CartLine[]
): Promise<(QuoteResult & { code: string }) | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, code)
  if (isError(priced)) return priced
  return { ...toQuoteResult(priced), code: priced.coupon?.code ?? code.trim().toUpperCase() }
}

/** UPI QR for the exact server-computed total, from the store's own VPA. */
export async function getUpiQrAction(
  cart: CartLine[],
  couponCode?: string
): Promise<{ intent: string; svgDataUri: string; total: number; vpa: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  return computeUpiQr(tenantId, cart, couponCode)
}

export type PlaceOrderInput = {
  cart: CartLine[]
  couponCode?: string
  paymentProvider: PaymentProvider
  /** Mandatory for both guest and signed-in checkout — guests get an account resolved/created from it. */
  email: string
  /** Either an existing saved address, or a new one to use for this order. */
  addressId?: string
  address?: {
    name: string
    phone: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  /** UPI reference number, when paying by UPI. */
  utr?: string
  /** Uploaded payment screenshot URL — accepted as an alternative to a UTR, when paying by UPI. */
  paymentProofUrl?: string
}

export async function uploadPaymentProofAction(file: File): Promise<{ url: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  try {
    const url = await uploadPaymentProof(tenantId, file)
    return { url }
  } catch {
    return { error: 'Upload failed. Please try again.' }
  }
}

export async function placeOrderAction(input: PlaceOrderInput): Promise<{ orderId: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const result = await placeOrder(tenantId, user, input)
  // `reason` is an API-only affordance; the web client only ever reads `.error`, so keep
  // this action's returned shape exactly as it was.
  if ('error' in result) return { error: result.error }

  // No session to prove ownership on the next call (Razorpay create/verify) — this cookie
  // is that proof instead, scoped to exactly this order.
  if (result.isGuest) await setGuestOrderCookie(result.orderId, result.customerId)

  return { orderId: result.orderId }
}

// ── Razorpay ──

export async function createRazorpayOrderAction(
  orderId: string
): Promise<{ razorpayOrderId: string; keyId: string; amountPaise: number } | { error: string }> {
  const { tenantId } = await requireTenant()
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser()

  // Kept ahead of the ownership check (and duplicated inside createRazorpayOrderForOrder,
  // which the API route relies on) so an unconfigured account still reports "payments
  // unavailable" rather than "order not found", exactly as this action always has.
  if (!getRazorpayKeys()) return { error: 'Card & netbanking payments are not available right now.' }

  const customerId = user ? user.id : await readGuestOrderCustomerId(orderId)
  if (!customerId) return { error: 'Order not found.' }

  const result = await createRazorpayOrderForOrder({ tenantId, customerId, orderId })
  if ('error' in result) return { error: result.error }
  return result
}

export async function verifyRazorpayPaymentAction(params: {
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}): Promise<{ ok: true } | { error: string }> {
  const { tenantId } = await requireTenant()
  const {
    data: { user },
  } = await (await createServerClient()).auth.getUser()

  if (
    !verifyRazorpaySignature({
      razorpayOrderId: params.razorpayOrderId,
      razorpayPaymentId: params.razorpayPaymentId,
      signature: params.signature,
    })
  ) {
    return { error: 'Payment could not be verified.' }
  }

  const customerId = user ? user.id : await readGuestOrderCustomerId(params.orderId)
  if (!customerId) return { error: 'Payment could not be verified.' }

  // Shared with POST /api/v1/checkout/razorpay/verify. The signature check above is kept
  // here too so an unowned order still short-circuits before any DB work, exactly as before;
  // verifyRazorpayPayment re-checks it, which is cheap and keeps the lib safe on its own.
  const result = await verifyRazorpayPayment({
    tenantId,
    customerId,
    orderId: params.orderId,
    razorpayOrderId: params.razorpayOrderId,
    razorpayPaymentId: params.razorpayPaymentId,
    signature: params.signature,
  })
  if (!result.ok) return { error: 'Payment could not be verified.' }

  // Unchanged from before the extraction: the web action reports success even when the
  // update matched no row. The API route is stricter and 404s on that case.
  return { ok: true }
}
