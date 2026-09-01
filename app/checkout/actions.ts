'use server'

import { cookies } from 'next/headers'
import QRCode from 'qrcode'
import { requireTenant } from '@/lib/auth-guard'
import { createServerClient } from '@/lib/supabase/server'
import { cookieDomain } from '@/lib/supabase/cookie-domain'
import { uploadImage } from '@/lib/cloudinary'
import { withTenant } from '@/lib/prisma'
import { buildUpiIntent } from '@/lib/payments/upi'
import { createRazorpayOrder, getRazorpayKeys, verifyRazorpaySignature } from '@/lib/payments/razorpay'
import type { Quote } from '@/lib/checkout-pricing'
import {
  isPricingError,
  placeOrder,
  priceCart,
  type CartLine,
  type PaymentProvider,
  type PlaceOrderInput,
  type PricingContext,
} from '@/lib/data/checkout'

// Types moved to lib/data/checkout.ts alongside the logic that owns them; re-exported here
// so the checkout client keeps importing them from the action module it already uses.
export type { CartLine, PaymentProvider, PlaceOrderInput }

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

/**
 * Everything below re-reads prices, stock and coupons from the database. The client
 * sends product ids, sizes and quantities only — any total it computed is for display.
 */

/** What the summary card renders: unit prices come back from the DB too, so the line items and the total can never disagree. */
export type QuotedLine = { productId: string; size: string | null; quantity: number; unitPrice: number }

export type QuoteResult = { quote: Quote; lines: QuotedLine[] }

function toQuoteResult(priced: PricingContext): QuoteResult {
  return {
    quote: priced.quote,
    lines: priced.lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity, unitPrice: l.unitPrice })),
  }
}

/** Server-authoritative totals for display — the client never decides what anything costs. */
export async function getQuoteAction(cart: CartLine[], couponCode?: string): Promise<QuoteResult | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, couponCode)
  return isPricingError(priced) ? priced : toQuoteResult(priced)
}

export type AvailableCoupon = { code: string; type: 'percent' | 'fixed'; value: number }

/** Active, unexpired, not-yet-exhausted codes to promote near the coupon field — not a
 *  substitute for validateCouponAction, which re-checks everything (incl. minOrder) at apply time. */
export async function getAvailableCouponsAction(): Promise<AvailableCoupon[]> {
  const { tenantId } = await requireTenant()
  const now = new Date()
  const codes = await withTenant(tenantId, (db) =>
    db.discountCode.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { code: true, type: true, value: true, usesLimit: true, usesCount: true },
    })
  )
  return codes
    .filter((c) => c.usesLimit === null || c.usesCount < c.usesLimit)
    .map((c) => ({ code: c.code, type: c.type, value: Number(c.value) }))
}

export async function validateCouponAction(
  code: string,
  cart: CartLine[]
): Promise<(QuoteResult & { code: string }) | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, code)
  if (isPricingError(priced)) return priced
  return { ...toQuoteResult(priced), code: priced.coupon?.code ?? code.trim().toUpperCase() }
}

/** UPI QR for the exact server-computed total, from the store's own VPA. */
export async function getUpiQrAction(
  cart: CartLine[],
  couponCode?: string
): Promise<{ intent: string; svgDataUri: string; total: number; vpa: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  const priced = await priceCart(tenantId, cart, couponCode)
  if (isPricingError(priced)) return priced

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })
  )
  const upi = (tenant?.paymentConfig as { upi?: { enabled?: boolean; upiId?: string } } | null)?.upi
  if (!upi?.enabled || !upi.upiId) return { error: 'This store has not set up UPI payments yet.' }

  const intent = buildUpiIntent({
    vpa: upi.upiId,
    storeName: priced.storeName,
    amount: priced.quote.total,
    note: `Order at ${priced.storeName}`,
  })
  const svg = await QRCode.toString(intent, { type: 'svg', margin: 1, width: 240 })

  return {
    intent,
    svgDataUri: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
    total: priced.quote.total,
    vpa: upi.upiId,
  }
}

export async function uploadPaymentProofAction(file: File): Promise<{ url: string } | { error: string }> {
  const { tenantId } = await requireTenant()
  try {
    const url = await uploadImage(file, `talam/${tenantId}/payment-proofs`)
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

  const keys = getRazorpayKeys()
  if (!keys) return { error: 'Card & netbanking payments are not available right now.' }

  const customerId = user ? user.id : await readGuestOrderCustomerId(orderId)
  if (!customerId) return { error: 'Order not found.' }

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId, customerId }, select: { total: true } })
  )
  if (!order) return { error: 'Order not found.' }

  const amountPaise = Math.round(Number(order.total) * 100)
  const razorpayOrder = await createRazorpayOrder(amountPaise, orderId)

  await withTenant(tenantId, (db) =>
    db.order.update({ where: { id: orderId }, data: { paymentId: razorpayOrder.id } })
  )

  return { razorpayOrderId: razorpayOrder.id, keyId: keys.keyId, amountPaise }
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

  await withTenant(tenantId, (db) =>
    db.order.updateMany({
      where: { id: params.orderId, tenantId, customerId },
      data: { paymentStatus: 'paid', paymentId: params.razorpayPaymentId, status: 'confirmed' },
    })
  )
  return { ok: true }
}
