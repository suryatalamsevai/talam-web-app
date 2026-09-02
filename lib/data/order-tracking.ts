import type { OrderStatus } from '@prisma/client'
import { getCustomerOrder } from '@/lib/data/storefront-orders'
import { getShiprocketTracking, type ShiprocketTrackingStatus } from '@/lib/shipping/shiprocket'

/**
 * Delivery tracking for one customer's own order.
 *
 * Ownership is not re-implemented here: this goes through getCustomerOrder, whose query is
 * scoped by tenantId *and* customerId, so a guessed order id belonging to another customer
 * or another tenant reads as "doesn't exist" (null) exactly as it does everywhere else.
 */

export type OrderTracking = {
  orderId: string
  code: string
  /** The order's own lifecycle status (pending/confirmed/shipped/...), always present. */
  status: OrderStatus
  /** The stored AWB, null until the order is handed to Shiprocket. */
  trackingId: string | null
  /**
   * 'shiprocket' when `shipment` carries live courier scans; 'order_status' when it doesn't —
   * either no AWB yet, or the Shiprocket lookup failed / timed out / had nothing to report.
   */
  source: 'shiprocket' | 'order_status'
  shipment: ShiprocketTrackingStatus | null
}

export async function getOrderTracking(
  tenantId: string,
  customerId: string,
  orderId: string
): Promise<OrderTracking | null> {
  const order = await getCustomerOrder(tenantId, customerId, orderId)
  if (!order) return null

  const base: OrderTracking = {
    orderId: order.id,
    code: order.code,
    status: order.status,
    trackingId: order.trackingId,
    source: 'order_status',
    shipment: null,
  }

  if (!order.trackingId) return base

  // Graceful degradation, on purpose: Shiprocket being slow, down, disconnected, or simply
  // not having scanned the parcel yet is not a failure of *this* endpoint. The order status
  // and the AWB are already in our own database, so the customer still gets a useful answer
  // and a 200 — never a 5xx that a mobile client would surface as "tracking is broken".
  try {
    const shipment = await getShiprocketTracking(tenantId, order.trackingId)
    if (!shipment) return base

    return { ...base, source: 'shiprocket', shipment }
  } catch (err) {
    console.error('[order-tracking] Shiprocket lookup failed, falling back to stored status', err)
    return base
  }
}
