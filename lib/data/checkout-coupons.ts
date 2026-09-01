import { withTenant } from '@/lib/prisma'

export type AvailableCoupon = { code: string; type: 'percent' | 'fixed'; value: number }

/**
 * Active, unexpired, not-yet-exhausted discount codes to promote near the coupon field.
 * Not a substitute for the checkout coupon-validation flow, which re-checks everything
 * (incl. minOrder) at apply time. Shared by the storefront's Server Action and the mobile
 * API route.
 */
export async function getAvailableCoupons(tenantId: string): Promise<AvailableCoupon[]> {
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
