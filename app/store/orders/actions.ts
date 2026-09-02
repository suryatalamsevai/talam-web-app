'use server'

import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { reportOrderProblem } from '@/lib/data/storefront-orders'

export async function reportOrderProblemAction(orderId: string, reason: string): Promise<{ error?: string }> {
  const user = await requireAuth('/orders')
  const { tenantId } = await requireTenant()
  return reportOrderProblem(tenantId, user.id, orderId, reason)
}
