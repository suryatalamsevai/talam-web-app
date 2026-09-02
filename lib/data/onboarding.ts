import { withTenant } from '@/lib/prisma'

export type SaveOnboardingInput = {
  preferredCategories: string[]
  preferredSize: string | null
}

// `customer.id` is the Supabase auth user id and is globally unique on its own — the
// `tenantId` filter below isn't there to disambiguate the row, it's what stops a bearer
// token resolved against tenant B from writing onboarding state for a customer who
// actually belongs to tenant A.
export async function saveOnboarding(
  tenantId: string,
  customerId: string,
  input: SaveOnboardingInput
): Promise<void> {
  const { count } = await withTenant(tenantId, (db) =>
    db.customer.updateMany({
      where: { id: customerId, tenantId },
      data: {
        preferredCategories: input.preferredCategories,
        preferredSize: input.preferredSize,
        onboardingComplete: true,
      },
    })
  )

  if (count === 0) {
    throw new Error('Customer not found')
  }
}
