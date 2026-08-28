import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getCategories } from '@/lib/data/products'

// Mobile counterpart of the storefront pages' direct getCategories() calls (app/store/layout.tsx,
// app/store/[department]/page.tsx, app/store/category/[categorySlug]/page.tsx, etc.) — currently
// RSC-only, with no Server Action layer to wrap, so this reuses lib/data/products.ts's
// getCategories directly and shapes the same fields those pages already pick for the client.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const department = new URL(request.url).searchParams.get('department') ?? undefined
  const categories = await getCategories(tenant.id, department)

  return apiSuccess(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      department: c.department,
    }))
  )
}
