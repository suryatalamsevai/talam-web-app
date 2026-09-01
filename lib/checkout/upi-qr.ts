import QRCode from 'qrcode'
import { withTenant } from '@/lib/prisma'
import { buildUpiIntent } from '@/lib/payments/upi'
import { priceCart, isError, type CartLine } from '@/lib/checkout/price-cart'

/**
 * UPI QR for the exact server-computed total, from the store's own VPA. Pure
 * computation from tenant config + cart total — no side effects, safe to retry.
 * Shared by app/checkout/actions.ts's getUpiQrAction and POST /api/v1/checkout/upi-qr.
 */

export type UpiQrResult = { intent: string; svgDataUri: string; total: number; vpa: string }

export async function computeUpiQr(
  tenantId: string,
  cart: CartLine[],
  couponCode?: string
): Promise<UpiQrResult | { error: string }> {
  const priced = await priceCart(tenantId, cart, couponCode)
  if (isError(priced)) return priced

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
