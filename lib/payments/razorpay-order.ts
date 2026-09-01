import { withTenant } from '@/lib/prisma'
import { createRazorpayOrder, getRazorpayKeys } from '@/lib/payments/razorpay'

/**
 * Shared core of app/checkout/actions.ts's createRazorpayOrderAction and
 * app/api/v1/checkout/razorpay/order/route.ts, so the web and mobile surfaces stay in
 * lockstep. Callers own their own ownership proof (a signed-in user, or the guest-order
 * cookie on the web) and pass the resolved `customerId` in; this function re-checks that
 * the order actually belongs to `tenantId` + `customerId` before touching Razorpay.
 *
 * NOT idempotent: every call mints a brand-new Razorpay order and overwrites the stored
 * `paymentId`, so a retry invalidates the Razorpay order id issued by the previous call
 * (the caller must use whichever `razorpayOrderId` it most recently received; the earlier
 * Razorpay order is left orphaned). This is inherited from the original Server Action.
 * Final payment-state correctness does not depend on it: app/api/webhooks/razorpay/route.ts
 * only transitions an order it matches on `paymentId` + `paymentStatus: 'pending'`, so only
 * the Razorpay order that is actually paid — and is the order's current `paymentId` at
 * webhook-delivery time — ever flips the row to paid/failed.
 */

export type RazorpayOrderFailureReason = 'payments_unavailable' | 'order_not_found'

export type CreateRazorpayOrderForOrderResult =
  | { razorpayOrderId: string; keyId: string; amountPaise: number }
  | { error: string; reason: RazorpayOrderFailureReason }

export async function createRazorpayOrderForOrder(params: {
  tenantId: string
  customerId: string
  orderId: string
}): Promise<CreateRazorpayOrderForOrderResult> {
  const { tenantId, customerId, orderId } = params

  const keys = getRazorpayKeys()
  if (!keys) {
    return { error: 'Card & netbanking payments are not available right now.', reason: 'payments_unavailable' }
  }

  const order = await withTenant(tenantId, (db) =>
    db.order.findFirst({ where: { id: orderId, tenantId, customerId }, select: { total: true } })
  )
  if (!order) return { error: 'Order not found.', reason: 'order_not_found' }

  const amountPaise = Math.round(Number(order.total) * 100)
  const razorpayOrder = await createRazorpayOrder(amountPaise, orderId)

  await withTenant(tenantId, (db) =>
    db.order.update({ where: { id: orderId }, data: { paymentId: razorpayOrder.id } })
  )

  return { razorpayOrderId: razorpayOrder.id, keyId: keys.keyId, amountPaise }
}
