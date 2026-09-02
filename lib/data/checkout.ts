import { headers } from 'next/headers'
import { prisma, withTenant } from '@/lib/prisma'
import { resolveOrCreateGuestCustomer } from '@/lib/auth/resolve-guest-customer'
import { createNotification } from '@/lib/data/notifications'
import { sendNewOrderEmail, sendOrderPlacedEmail, type OrderEmailItem } from '@/lib/resend'
import { getAdminUrl, getStoreUrl, isLocalDevHost } from '@/lib/tenant-url'
import { orderCode } from '@/lib/data/storefront-orders'
import { decrementStock, stockFor } from '@/lib/checkout-pricing'
import {
  isError as isPricingError,
  priceCart,
  type CartLine,
  type PricingContext,
} from '@/lib/checkout/price-cart'

/**
 * Checkout's database-backed core, shared by the web Server Actions in
 * `app/checkout/actions.ts` and the mobile REST routes under `app/api/v1/checkout/**`.
 *
 * Order placement re-reads prices, stock and coupons from the database via the shared
 * `priceCart` (lib/checkout/price-cart.ts) — the client sends product ids, sizes and
 * quantities only; any total it computed is for display.
 *
 * Deliberately free of request-surface concerns: no cookies, no redirects, no
 * `Authorization` parsing. Callers resolve the tenant and the acting user themselves and
 * pass them in, so the same logic serves a cookie session and a bearer token identically.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type { CartLine, PricingContext }
export { isPricingError, priceCart }

export type PaymentProvider = 'upi_manual' | 'razorpay' | 'cod'

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

export type PlaceOrderSuccess = {
  orderId: string
  /** The customer the order was filed under — the caller's own id when signed in, a
   *  resolved/created guest customer otherwise. */
  customerId: string
  /** True when no authenticated user was supplied and a guest customer was resolved instead.
   *  The web action uses this to decide whether it needs to mint its guest-ownership cookie. */
  isGuest: boolean
}

export type PlaceOrderFailure = {
  error: string
  /** Set only when the transaction lost a stock race, so an API caller can map it to a
   *  distinguishable response instead of re-parsing the human-readable message. */
  reason?: 'out_of_stock'
}

/**
 * Creates an order from a cart, re-pricing and re-checking stock server-side.
 *
 * NOT IDEMPOTENT. Every successful call creates a brand-new `Order` row and decrements
 * stock again, so two calls for the same cart produce two independent orders. Callers that
 * need to retry a *payment* must hold on to the `orderId` from the first success and update
 * that order instead of calling this again.
 */
export async function placeOrder(
  tenantId: string,
  user: { id: string } | null,
  input: PlaceOrderInput
): Promise<PlaceOrderSuccess | PlaceOrderFailure> {
  if (!EMAIL_RE.test(input.email?.trim() ?? '')) {
    return { error: 'Enter a valid email address.' }
  }

  const priced = await priceCart(tenantId, input.cart, input.couponCode)
  if (isPricingError(priced)) return priced

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
      return {
        error: `${err.productName}${err.size ? ` (${err.size})` : ''} just went out of stock.`,
        reason: 'out_of_stock',
      }
    }
    throw err
  }

  // The order row is the source of truth — a mail or notification failure must never
  // undo a placed (and possibly paid) order, so this is deliberately outside the transaction.
  try {
    await notifyOrderPlaced({ tenantId, customerId, orderId, priced, shippingAddress })
  } catch (err) {
    console.error('[checkout] order notifications failed for', orderId, err)
  }

  return { orderId, customerId, isGuest: !user }
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
