import { withTenant } from '@/lib/prisma'

export type UpdateProfileInput = {
  name: string
  phone: string
}

// `customer.id` is the Supabase auth user id, so it's globally unique on its own — the
// `tenantId` filter below isn't there to disambiguate the row, it's what stops a bearer
// token resolved against tenant B from updating a customer who actually belongs to tenant A.
export async function updateCustomerProfile(
  tenantId: string,
  customerId: string,
  input: UpdateProfileInput
): Promise<void> {
  const { count } = await withTenant(tenantId, (db) =>
    db.customer.updateMany({
      where: { id: customerId, tenantId },
      data: { name: input.name, phone: input.phone || null },
    })
  )

  if (count === 0) {
    throw new Error('Customer not found')
  }
}
