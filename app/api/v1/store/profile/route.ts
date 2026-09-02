import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { updateCustomerProfile, type UpdateProfileInput } from '@/lib/data/customer-profile'

function parseInput(body: unknown): UpdateProfileInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  if (typeof b.name !== 'string' || !b.name) return null
  if (b.phone !== undefined && typeof b.phone !== 'string') return null

  return { name: b.name, phone: (b.phone as string) ?? '' }
}

// Mobile counterpart of app/store/account/profile/actions.ts's updateCustomerProfile,
// wrapping the same lib/data/customer-profile.ts function so both surfaces stay in lockstep.
export async function PATCH(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return apiError('invalid_request', 'Invalid profile payload')

  try {
    await updateCustomerProfile(tenant.id, user.id, input)
  } catch {
    return apiError('not_found', 'Customer not found')
  }

  return apiSuccess({ updated: true })
}
