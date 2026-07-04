import { createAdminClient } from '@/lib/supabase/admin'

export type TenantMeta = {
  id: string
  slug: string
  tier: string
}

export async function getTenantBySlug(slug: string): Promise<TenantMeta | null> {
  if (!slug) return null

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('id, slug, tier')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as TenantMeta
}
