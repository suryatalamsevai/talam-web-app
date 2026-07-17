'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'

export type NewAddress = {
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

export async function createAddress(input: NewAddress) {
  const user = await requireAuth('/account/addresses')
  const { tenantId } = await requireTenant()

  await prisma.$transaction(async (tx) => {
    if (input.isDefault) {
      await tx.address.updateMany({
        where: { tenantId, customerId: user.id },
        data: { isDefault: false },
      })
    }

    await tx.address.create({
      data: {
        tenantId,
        customerId: user.id,
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
