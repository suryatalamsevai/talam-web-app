import { withTenant } from '@/lib/prisma'

export type AddressItem = {
  id: string
  label: string
  name: string
  line1: string
  line2: string | null
  city: string
  state: string
  pincode: string
  phone: string
  isDefault: boolean
}

export async function getAddresses(tenantId: string, customerId: string): Promise<AddressItem[]> {
  return withTenant(tenantId, (db) =>
    db.address.findMany({
      where: { tenantId, customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        label: true,
        name: true,
        line1: true,
        line2: true,
        city: true,
        state: true,
        pincode: true,
        phone: true,
        isDefault: true,
      },
    })
  )
}
