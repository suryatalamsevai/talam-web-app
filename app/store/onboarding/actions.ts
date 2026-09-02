'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { saveOnboarding } from '@/lib/data/onboarding'

export async function saveOnboardingAction(data: {
  preferredCategories: string[]
  preferredSize: string | null
}) {
  const { tenantId } = await requireTenant()
  const user = await requireAuth()

  await saveOnboarding(tenantId, user.id, data)

  return { ok: true }
}
