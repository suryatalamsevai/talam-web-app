import { createAdminClient } from '@/lib/supabase/admin'

export type TenantMeta = {
  id: string
  slug: string
  tier: string
}

const TTL_MS = 60_000
// ponytail: module-level Map, per-instance only, add Redis/shared cache if edge instances multiply and hit rate matters
const cache = new Map<string, { tenant: TenantMeta | null; expires: number }>()

export async function getTenantBySlug(slug: string): Promise<TenantMeta | null> {
  if (!slug) return null

  const cached = cache.get(slug)
  if (cached && cached.expires > Date.now()) return cached.tenant

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, tier')
    .eq('slug', slug)
    .single()

  const tenant = error || !data ? null : (data as TenantMeta)
  cache.set(slug, { tenant, expires: Date.now() + TTL_MS })
  return tenant
}

export async function getTenantById(id: string): Promise<TenantMeta | null> {
  if (!id) return null

  const cacheKey = `id:${id}`
  const cached = cache.get(cacheKey)
  if (cached && cached.expires > Date.now()) return cached.tenant

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, tier')
    .eq('id', id)
    .single()

  const tenant = error || !data ? null : (data as TenantMeta)
  cache.set(cacheKey, { tenant, expires: Date.now() + TTL_MS })
  return tenant
}

/**
 * Mobile-facing counterpart to proxy.ts's host/subdomain resolution (`getTenantSlug` +
 * `getTenantBySlug`, wired into request headers by `createTenantResponse`). Mobile clients
 * never go through the proxy and have no host to parse, so they send the tenant explicitly —
 * as `x-tenant-id` or `x-tenant-slug` — and this resolves it to the same `TenantMeta` shape
 * the proxy would otherwise inject. `x-tenant-id` wins when both are present.
 */
export async function resolveTenantForApi(request: Request): Promise<TenantMeta | null> {
  const tenantId = request.headers.get('x-tenant-id')
  if (tenantId) return getTenantById(tenantId)

  const slug = request.headers.get('x-tenant-slug')
  if (slug) return getTenantBySlug(slug)

  return null
}
