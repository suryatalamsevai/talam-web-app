import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { reportOrderProblem } from '@/lib/data/storefront-orders'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('not_found', 'Unknown tenant.')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token.')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return apiError('invalid_request', 'Invalid JSON body.')
  }

  const reason = typeof (body as { reason?: unknown })?.reason === 'string' ? (body as { reason: string }).reason : ''

  const { id } = await params
  const result = await reportOrderProblem(tenant.id, user.id, id, reason)
  if (result.error) {
    // reportOrderProblem returns the same string for "not found" and "not scoped to this
    // customer" — a guessed order id must 404 identically either way, never distinguishing.
    const notFound = result.error === 'Order not found.'
    return apiError(notFound ? 'not_found' : 'invalid_request', result.error)
  }

  return apiSuccess({ ok: true })
}
