'use server'

import { getRequestTenantId } from '@/lib/data/tenant'
import { searchProducts } from '@/lib/data/search'

export async function searchProductsAction(query: string) {
  const tenantId = await getRequestTenantId()
  if (!tenantId || !query.trim()) return []
  return searchProducts(tenantId, query)
}
