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
