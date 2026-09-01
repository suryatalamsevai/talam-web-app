import { withTenant } from '@/lib/prisma'
import {
  checkCoupon,
  computeQuote,
  stockFor,
  COUPON_ERROR_MESSAGE,
  type CouponRow,
  type Quote,
  type QuoteLine,
} from '@/lib/checkout-pricing'

export type CartLine = { productId: string; size?: string | null; quantity: number }

/**
 * Everything below re-reads prices, stock and coupons from the database. The client
 * sends product ids, sizes and quantities only — any total it computed is for display.
 */

export type PricingContext = {
  tenantId: string
  quote: Quote
  lines: (QuoteLine & { productName: string })[]
  coupon: { id: string; code: string } | null
  storeName: string
}

/** Shared by the checkout Server Actions (app/checkout/actions.ts) and their `v1` API
 *  route counterparts — both surfaces must price a cart identically. */
export async function priceCart(
  tenantId: string,
  cart: CartLine[],
  couponCode?: string
): Promise<PricingContext | { error: string }> {
  const clean = cart.filter((l) => Number.isInteger(l.quantity) && l.quantity > 0)
  if (clean.length === 0) return { error: 'Your cart is empty.' }

  const [tenant, products] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, shippingFee: true, freeDeliveryAbove: true },
      }),
      db.product.findMany({
        where: { id: { in: clean.map((l) => l.productId) }, tenantId, deletedAt: null, isActive: true, status: 'published' },
        select: { id: true, name: true, price: true, comparePrice: true, stockBySize: true },
      }),
    ])
  )
  if (!tenant) return { error: 'Store not found.' }

  const byId = new Map(products.map((p) => [p.id, p]))
  const lines: (QuoteLine & { productName: string })[] = []

  for (const line of clean) {
    const product = byId.get(line.productId)
    if (!product) return { error: 'One of the items in your cart is no longer available.' }

    const size = line.size ?? null
    if (stockFor(product.stockBySize, size) < line.quantity) {
      return { error: `${product.name}${size ? ` (${size})` : ''} is out of stock.` }
    }

    lines.push({
      productId: product.id,
      productName: product.name,
      size,
      quantity: line.quantity,
      unitPrice: Number(product.price),
      compareAtPrice: product.comparePrice === null ? null : Number(product.comparePrice),
    })
  }

  const itemsTotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)

  let couponRow: (CouponRow & { id: string; code: string }) | null = null
  if (couponCode?.trim()) {
    const found = await withTenant(tenantId, (db) =>
      db.discountCode.findUnique({ where: { tenantId_code: { tenantId, code: couponCode.trim().toUpperCase() } } })
    )
    if (!found) return { error: COUPON_ERROR_MESSAGE.not_found }
    const row: CouponRow & { id: string; code: string } = {
      id: found.id,
      code: found.code,
      type: found.type,
      value: Number(found.value),
      minOrder: found.minOrder === null ? null : Number(found.minOrder),
      usesLimit: found.usesLimit,
      usesCount: found.usesCount,
      expiresAt: found.expiresAt,
      isActive: found.isActive,
    }
    const rejection = checkCoupon(row, itemsTotal)
    if (rejection) return { error: COUPON_ERROR_MESSAGE[rejection] }
    couponRow = row
  }

  return {
    tenantId,
    storeName: tenant.name,
    lines,
    coupon: couponRow ? { id: couponRow.id, code: couponRow.code } : null,
    quote: computeQuote({
      lines,
      shippingFee: Number(tenant.shippingFee),
      freeDeliveryAbove: tenant.freeDeliveryAbove === null ? null : Number(tenant.freeDeliveryAbove),
      coupon: couponRow,
    }),
  }
}

export function isError(value: PricingContext | { error: string }): value is { error: string } {
  return 'error' in value
}

/** What the summary card renders: unit prices come back from the DB too, so the line items and the total can never disagree. */
export type QuotedLine = { productId: string; size: string | null; quantity: number; unitPrice: number }

export type QuoteResult = { quote: Quote; lines: QuotedLine[] }

export function toQuoteResult(priced: PricingContext): QuoteResult {
  return {
    quote: priced.quote,
    lines: priced.lines.map((l) => ({ productId: l.productId, size: l.size, quantity: l.quantity, unitPrice: l.unitPrice })),
  }
}
