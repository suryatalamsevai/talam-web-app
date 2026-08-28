'use server'

import { getRequestTenantId } from '@/lib/data/tenant'
import { createServerClient } from '@/lib/supabase/server'
import { getEmptyCartSuggestions as getEmptyCartSuggestionsData, type SuggestedProduct } from '@/lib/data/cart-suggestions'

export type { SuggestedProduct }

export async function getEmptyCartSuggestions(): Promise<{ source: string; items: SuggestedProduct[] }> {
  const tenantId = await getRequestTenantId()
  if (!tenantId) return { source: 'trending', items: [] }

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  return getEmptyCartSuggestionsData(tenantId, user?.id ?? null)
}
