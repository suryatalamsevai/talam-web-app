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

export type NewAddressInput = {
  label: string
  name: string
  line1: string
  line2: string
  city: string
  state: string
  pincode: string
  phone: string
  isDefault: boolean
}

export async function createAddress(
  tenantId: string,
  customerId: string,
  input: NewAddressInput
): Promise<void> {
  await withTenant(tenantId, async (db) => {
    if (input.isDefault) {
      await db.address.updateMany({
        where: { tenantId, customerId },
        data: { isDefault: false },
      })
    }

    await db.address.create({
      data: {
        tenantId,
        customerId,
        label: input.label,
        name: input.name,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        phone: input.phone,
        isDefault: input.isDefault,
      },
    })
  })
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
