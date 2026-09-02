import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { createAddress, type NewAddressInput } from '@/lib/data/addresses'

const REQUIRED_STRING_FIELDS = ['label', 'name', 'line1', 'city', 'state', 'pincode', 'phone'] as const

function parseInput(body: unknown): NewAddressInput | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof b[field] !== 'string' || !b[field]) return null
  }
  if (b.line2 !== undefined && typeof b.line2 !== 'string') return null
  if (b.isDefault !== undefined && typeof b.isDefault !== 'boolean') return null

  return {
    label: b.label as string,
    name: b.name as string,
    line1: b.line1 as string,
    line2: (b.line2 as string) ?? '',
    city: b.city as string,
    state: b.state as string,
    pincode: b.pincode as string,
    phone: b.phone as string,
    isDefault: (b.isDefault as boolean) ?? false,
  }
}

// Mobile counterpart of app/store/account/addresses/actions.ts's createAddress, wrapping the
// same lib/data/addresses.ts function so both surfaces stay in lockstep.
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const body = await request.json().catch(() => null)
  const input = parseInput(body)
  if (!input) return apiError('invalid_request', 'Invalid address payload')

  await createAddress(tenant.id, user.id, input)
  return apiSuccess({ created: true }, 201)
}
