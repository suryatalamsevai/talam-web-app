import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { searchProducts } from '@/lib/data/search'

// Mobile counterpart of app/store/actions.ts's searchProductsAction, wrapping the same
// lib/data/search.ts function so both surfaces stay in lockstep.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const query = new URL(request.url).searchParams.get('q') ?? ''
  const products = await searchProducts(tenant.id, query)
  return apiSuccess(products)
}
