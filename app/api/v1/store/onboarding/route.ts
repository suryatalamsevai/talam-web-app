import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { saveOnboarding, type SaveOnboardingInput } from '@/lib/data/onboarding'

function parseInput(body: unknown): SaveOnboardingInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  if (!Array.isArray(b.preferredCategories) || !b.preferredCategories.every((c) => typeof c === 'string')) {
    return null
  }
  if (b.preferredSize !== undefined && b.preferredSize !== null && typeof b.preferredSize !== 'string') {
    return null
  }

  return {
    preferredCategories: b.preferredCategories as string[],
    preferredSize: (b.preferredSize as string | null) ?? null,
  }
}

// Mobile counterpart of app/store/onboarding/actions.ts's saveOnboardingAction,
// wrapping the same lib/data/onboarding.ts function so both surfaces stay in lockstep.
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return apiError('invalid_request', 'Invalid onboarding payload')

  try {
    await saveOnboarding(tenant.id, user.id, input)
  } catch {
    return apiError('not_found', 'Customer not found')
  }

  return apiSuccess({ saved: true })
}
