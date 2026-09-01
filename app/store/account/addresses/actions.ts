'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { createAddress as createAddressLib, type NewAddressInput } from '@/lib/data/addresses'

export type NewAddress = NewAddressInput

export async function createAddress(input: NewAddress) {
  const user = await requireAuth('/account/addresses')
  const { tenantId } = await requireTenant()

  await createAddressLib(tenantId, user.id, input)
}
