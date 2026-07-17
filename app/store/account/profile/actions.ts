'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { prisma } from '@/lib/prisma'

export async function updateCustomerProfile({ name, phone }: { name: string; phone: string }) {
  const user = await requireAuth('/account/profile')
  await requireTenant()

  await prisma.customer.update({
    where: { id: user.id },
    data: { name, phone: phone || null },
  })
}
