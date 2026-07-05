import { withTenant } from '@/lib/prisma'

export type TenantStorefront = {
  id: string
  name: string
  tagline: string | null
  brandColor: string | null
  logoUrl: string | null
  whatsappNumber: string | null
  showWhatsappButton: boolean
  tier: string
  freeDeliveryAbove: number | null
  shippingFee: number
  deliveryEstimateText: string | null
  returnWindowDays: number | null
  trustBadgeText: string | null
  sizeGuideUrl: string | null
}

export async function getTenantStorefront(tenantId: string): Promise<TenantStorefront | null> {
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        tagline: true,
        brandColor: true,
        logoUrl: true,
        whatsappNumber: true,
        showWhatsappButton: true,
        tier: true,
        freeDeliveryAbove: true,
        shippingFee: true,
        deliveryEstimateText: true,
        returnWindowDays: true,
        trustBadgeText: true,
        sizeGuideUrl: true,
      },
    })
  )

  if (!tenant) return null

  // Prisma returns Decimal for these two — narrow to number to match the TenantStorefront contract.
  return {
    ...tenant,
    freeDeliveryAbove: tenant.freeDeliveryAbove ? Number(tenant.freeDeliveryAbove) : null,
    shippingFee: Number(tenant.shippingFee),
  }
}
