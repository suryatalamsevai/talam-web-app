'use server'

import { cookies, headers } from 'next/headers'
import { requireTenant } from '@/lib/auth-guard'
import { createServerClient } from '@/lib/supabase/server'
import { cookieDomain } from '@/lib/supabase/cookie-domain'
import { resolveOrCreateGuestCustomer } from '@/lib/auth/resolve-guest-customer'
import { uploadPaymentProof } from '@/lib/checkout/payment-proof'
import { prisma, withTenant } from '@/lib/prisma'
import { createNotification } from '@/lib/data/notifications'
import { getAvailableCoupons, type AvailableCoupon } from '@/lib/data/checkout-coupons'
import { sendNewOrderEmail, sendOrderPlacedEmail, type OrderEmailItem } from '@/lib/resend'
import { getAdminUrl, getStoreUrl, isLocalDevHost } from '@/lib/tenant-url'
import { orderCode } from '@/lib/data/storefront-orders'
import { createRazorpayOrder, getRazorpayKeys, verifyRazorpaySignature } from '@/lib/payments/razorpay'
import { decrementStock, stockFor } from '@/lib/checkout-pricing'
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

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

  if (!EMAIL_RE.test(input.email?.trim() ?? '')) {
    return { error: 'Enter a valid email address.' }
  }

  const priced = await priceCart(tenantId, input.cart, input.couponCode)
  if (isError(priced)) return priced

  // Guests never have saved addresses (the checkout page only loads them for a signed-in
  // user), so ignore any addressId a guest submission might carry and force a new address.
  const addressInput = user ? input : { ...input, addressId: undefined }
  const shippingAddress = await resolveAddress(tenantId, user?.id ?? '', addressInput)
  if (!shippingAddress) return { error: 'A delivery address is required.' }

  let customerId: string
  if (user) {
    customerId = user.id
    // Backfill only — never overwrite an email already on file.
    await withTenant(tenantId, (db) =>
      db.customer.updateMany({ where: { id: user.id, tenantId, email: null }, data: { email: input.email.trim() } })
    )
  } else {
    const resolved = await resolveOrCreateGuestCustomer(tenantId, { email: input.email.trim(), phone: shippingAddress.phone })
    if ('error' in resolved) {
      return { error: 'An account already exists for this email or phone. Sign in to continue.' }
    }
    customerId = resolved.customerId
  }

  const hasValidUtr = /^\d{12}$/.test(input.utr ?? '')
  if (input.paymentProvider === 'upi_manual' && !hasValidUtr && !input.paymentProofUrl) {
    return { error: 'Enter the 12-digit UPI reference number, or upload a payment screenshot.' }
  }

  let orderId: string
  try {
    orderId = await withTenant(tenantId, async (db) => {
      // Re-read stock inside the transaction: priceCart's check was advisory, this one
      // is the one that actually prevents two shoppers buying the last item.
      for (const line of priced.lines) {
        const product = await db.product.findUniqueOrThrow({
          where: { id: line.productId },
          select: { stockBySize: true },
        })
        if (stockFor(product.stockBySize, line.size) < line.quantity) {
          throw new OutOfStockError(line.productName, line.size)
        }
        await db.product.update({
          where: { id: line.productId },
          data: { stockBySize: decrementStock(product.stockBySize, line.size, line.quantity) },
        })
      }

      const order = await db.order.create({
        data: {
          tenantId,
          customerId,
          status: 'pending',
          itemsTotal: priced.quote.itemsTotal,
          discount: priced.quote.couponDiscount,
          shippingFee: priced.quote.shippingFee,
          discountCode: priced.coupon?.code ?? null,
          total: priced.quote.total,
          paymentProvider: input.paymentProvider,
          paymentId: input.paymentProvider === 'upi_manual' ? (input.utr || null) : null,
          paymentProofUrl: input.paymentProvider === 'upi_manual' ? (input.paymentProofUrl ?? null) : null,
          paymentStatus: 'pending',
          shippingAddress,
          items: {
            create: priced.lines.map((line) => ({
              tenantId,
              productId: line.productId,
              productName: line.productName,
              size: line.size,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
            })),
          },
        },
        select: { id: true },
      })

      if (priced.coupon) {
        await db.discountCode.update({
          where: { id: priced.coupon.id },
          data: { usesCount: { increment: 1 } },
        })
      }

      return order.id
    })
  } catch (err) {
    if (err instanceof OutOfStockError) {
      return { error: `${err.productName}${err.size ? ` (${err.size})` : ''} just went out of stock.` }
    }
    throw err
  }

  // No session to prove ownership on the next call (Razorpay create/verify) — this cookie
  // is that proof instead, scoped to exactly this order.
  if (!user) await setGuestOrderCookie(orderId, customerId)

  // The order row is the source of truth — a mail or notification failure must never
  // undo a placed (and possibly paid) order, so this is deliberately outside the transaction.
  try {
    await notifyOrderPlaced({ tenantId, customerId, orderId, priced, shippingAddress })
  } catch (err) {
    console.error('[checkout] order notifications failed for', orderId, err)
  }

  return { orderId }
}

class OutOfStockError extends Error {
  constructor(readonly productName: string, readonly size: string | null) {
    super('out_of_stock')
  }
}

async function resolveAddress(tenantId: string, customerId: string, input: PlaceOrderInput) {
  if (input.addressId) {
    const saved = await withTenant(tenantId, (db) =>
      db.address.findFirst({ where: { id: input.addressId, tenantId, customerId } })
    )
    if (!saved) return null
    return {
      name: saved.name,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2 ?? '',
      city: saved.city,
      state: saved.state,
      pincode: saved.pincode,
    }
  }
  if (!input.address) return null
  return { ...input.address, line2: input.address.line2 ?? '' }
}

type ShippingAddress = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string }

async function notifyOrderPlaced(params: {
  tenantId: string
  customerId: string
  orderId: string
  priced: PricingContext
  shippingAddress: ShippingAddress
}) {
  const { tenantId, orderId, priced } = params
  const code = orderCode(orderId)

  const [tenant, customer, host] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true, name: true, contactEmail: true, notifyEmailOnOrder: true },
    }),
    prisma.customer.findUnique({ where: { id: params.customerId }, select: { name: true, email: true } }),
    headers().then((h) => h.get('host')),
  ])
  if (!tenant) return

  // getStoreUrl/getAdminUrl return a bare path in local dev; emails need an absolute
  // URL, so prefix the request origin there.
  const isLocalDev = isLocalDevHost(host)
  const origin = isLocalDev ? `http://${host ?? 'localhost:3000'}` : ''
  const storeUrl = `${origin}${getStoreUrl(tenant.slug, isLocalDev)}`
  const adminOrdersUrl = `${origin}${getAdminUrl(tenant.slug, isLocalDev).replace(/\/admin\/dashboard$/, '/admin/orders')}`

  const items: OrderEmailItem[] = priced.lines.map((line) => ({
    name: line.productName,
    size: line.size,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))

  await createNotification(tenantId, {
    type: 'new_order',
    title: `New order ${code}`,
    body: `${customer?.name ?? 'A customer'} placed an order worth ₹${priced.quote.total.toLocaleString('en-IN')}.`,
    link: '/admin/orders',
  })

  if (customer?.email) {
    await sendOrderPlacedEmail(customer.email, {
      storeName: tenant.name,
      orderCode: code,
      items,
      total: priced.quote.total,
      addressLines: [
        params.shippingAddress.name,
        [params.shippingAddress.line1, params.shippingAddress.line2].filter(Boolean).join(', '),
        `${params.shippingAddress.city}, ${params.shippingAddress.state} ${params.shippingAddress.pincode}`,
        params.shippingAddress.phone,
      ].filter(Boolean),
      trackUrl: `${storeUrl}/orders/${orderId}`,
      invoiceUrl: `${storeUrl}/orders/${orderId}/invoice`,
    })
  } else {
    console.info('[checkout] no customer email on file — skipping order confirmation mail for', code)
  }

  if (tenant.notifyEmailOnOrder && tenant.contactEmail) {
    await sendNewOrderEmail(tenant.contactEmail, {
      storeName: tenant.name,
      orderCode: code,
      customerName: customer?.name ?? 'A customer',
      items,
      total: priced.quote.total,
      adminOrdersUrl,
    })
  }
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
