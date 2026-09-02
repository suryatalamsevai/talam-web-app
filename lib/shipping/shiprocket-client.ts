/**
 * Shiprocket REST calls, via plain fetch — same reasoning as lib/payments/razorpay.ts: the
 * surface we need (login, create order, assign AWB, track AWB) doesn't justify an SDK dependency.
 *
 * This module is deliberately pure: every credential and the pickup location arrive as
 * arguments, and nothing here reads process.env or the database. That is what makes it
 * usable per-tenant — see lib/shipping/shiprocket.ts for the orchestration that supplies
 * one tenant's credentials, and lib/shipping/shiprocket-account.ts for where they're stored.
 */

const API_BASE = 'https://apiv2.shiprocket.in/v1/external'

export type ShiprocketOrderInput = {
  orderId: string
  orderDate: Date
  paymentMethod: 'COD' | 'Prepaid'
  subTotal: number
  billing: {
    name: string
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
    phone: string
    email?: string
  }
  items: { name: string; sku: string; units: number; sellingPrice: number }[]
}

export type ShiprocketShipment = { awbCode: string; courierName: string; shipmentId: number }

/** One courier scan, newest first as Shiprocket returns them. */
export type ShiprocketTrackingActivity = {
  date: string
  activity: string
  location: string
}

export type ShiprocketTrackingStatus = {
  awbCode: string
  /** Courier's own status text, e.g. "In Transit" / "Delivered". Null before the first scan. */
  currentStatus: string | null
  courierName: string | null
  /** Estimated delivery date, as Shiprocket's `edd` string. Null when the courier hasn't set one. */
  estimatedDeliveryDate: string | null
  /** Shiprocket-hosted tracking page for this AWB, safe to open in a webview. */
  trackUrl: string | null
  activities: ShiprocketTrackingActivity[]
}

/**
 * Hard ceiling on the tracking round-trip. Tracking is a read on a screen the customer is
 * already looking at, so a slow courier lookup must degrade to the stored order status
 * rather than hold the request open — callers treat the AbortError like any other failure.
 */
const TRACKING_TIMEOUT_MS = 8_000

/**
 * Thrown by shiprocketLogin on a non-2xx response. Carries the HTTP status so callers can
 * tell an actual credential rejection (401/403) apart from a transient upstream problem
 * (5xx, 429, ...) instead of treating every failure as "wrong password".
 */
export class ShiprocketLoginError extends Error {
  readonly status: number

  constructor(status: number, body: string) {
    super(`Shiprocket login failed (${status}): ${body}`)
    this.name = 'ShiprocketLoginError'
    this.status = status
  }
}

function formatShiprocketDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Exchanges one Shiprocket account's credentials for a bearer token.
 *
 * Tokens last ~10 days but are deliberately not cached: the previous platform-level
 * singleton was already unreliable across serverless instances, and caching per tenant
 * multiplies that problem for no gain — shipments are created one at a time by hand.
 */
export async function shiprocketLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new ShiprocketLoginError(res.status, await res.text())

  const json = (await res.json()) as { token: string }
  return json.token
}

export async function createShiprocketOrder(
  token: string,
  pickupLocation: string,
  input: ShiprocketOrderInput
): Promise<{ shipmentId: number }> {
  const [billingFirstName, ...billingLastNameParts] = input.billing.name.trim().split(/\s+/)

  const res = await fetch(`${API_BASE}/orders/create/adhoc`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_id: input.orderId,
      order_date: formatShiprocketDate(input.orderDate),
      pickup_location: pickupLocation,
      billing_customer_name: billingFirstName,
      billing_last_name: billingLastNameParts.join(' '),
      billing_address: input.billing.line1,
      billing_address_2: input.billing.line2 ?? '',
      billing_city: input.billing.city,
      billing_pincode: input.billing.pincode,
      billing_state: input.billing.state,
      billing_country: 'India',
      billing_email: input.billing.email || 'orders@talam4shop.com',
      billing_phone: input.billing.phone,
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.units,
        selling_price: item.sellingPrice,
      })),
      payment_method: input.paymentMethod,
      sub_total: input.subTotal,
      // ponytail: hardcoded package weight/dims — no per-product weight field yet.
      // Upgrade path: add Product.weight, sum per order.
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    }),
  })
  if (!res.ok) throw new Error(`Shiprocket order creation failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as { order_id: number; shipment_id: number }
  return { shipmentId: json.shipment_id }
}

export async function assignShiprocketAwb(
  token: string,
  shipmentId: number
): Promise<{ awbCode: string; courierName: string }> {
  const res = await fetch(`${API_BASE}/courier/assign/awb`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ shipment_id: shipmentId }),
  })
  if (!res.ok) throw new Error(`Shiprocket AWB assignment failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as {
    response: { data: { awb_code: string; courier_name: string } }
  }
  return { awbCode: json.response.data.awb_code, courierName: json.response.data.courier_name }
}

/**
 * Reads live courier scans for one AWB.
 *
 * `GET /v1/external/courier/track/awb/{awb_code}` with the account bearer token, per
 * Shiprocket's own client (github.com/bfrs/shiprocket-mcp). The payload is
 * `{ tracking_data: { track_url, shipment_track: [{ current_status, courier_name, edd, ... }],
 * shipment_track_activities: [{ date, activity, location }] } }`, newest activity first.
 *
 * Returns null rather than throwing for the two "nothing to show yet" cases, which Shiprocket
 * signals with HTTP 200: `tracking_data.error` set (AWB not recognised), and an empty/absent
 * `shipment_track` (AWB assigned but not yet scanned by the courier). Both are ordinary states
 * for a freshly shipped order, not faults. A non-2xx or a timeout still throws, matching the
 * other calls in this module — see lib/data/order-tracking.ts for the fallback that catches it.
 */
export async function getShiprocketTrackingStatus(
  token: string,
  awbCode: string
): Promise<ShiprocketTrackingStatus | null> {
  const res = await fetch(`${API_BASE}/courier/track/awb/${encodeURIComponent(awbCode)}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TRACKING_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Shiprocket tracking lookup failed (${res.status}): ${await res.text()}`)

  const json = (await res.json()) as {
    tracking_data?: {
      error?: string
      track_url?: string | null
      shipment_track?: {
        awb_code?: string
        current_status?: string | null
        courier_name?: string | null
        edd?: string | null
      }[]
      shipment_track_activities?: { date?: string; activity?: string; location?: string }[]
    }
  }

  const trackingData = json.tracking_data
  if (!trackingData || trackingData.error) return null

  const shipment = trackingData.shipment_track?.[0]
  if (!shipment) return null

  return {
    awbCode: shipment.awb_code ?? awbCode,
    currentStatus: shipment.current_status ?? null,
    courierName: shipment.courier_name ?? null,
    estimatedDeliveryDate: shipment.edd ?? null,
    trackUrl: trackingData.track_url ?? null,
    activities: (trackingData.shipment_track_activities ?? []).map((activity) => ({
      date: activity.date ?? '',
      activity: activity.activity ?? '',
      location: activity.location ?? '',
    })),
  }
}
