'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { updateCustomerProfile as updateCustomerProfileLib } from '@/lib/data/customer-profile'

export async function updateCustomerProfile({ name, phone }: { name: string; phone: string }) {
  const user = await requireAuth('/account/profile')
  const { tenantId } = await requireTenant()

  await updateCustomerProfileLib(tenantId, user.id, { name, phone })
}
