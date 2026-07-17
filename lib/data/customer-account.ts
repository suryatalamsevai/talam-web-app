import { withTenant } from '@/lib/prisma'

export type AccountSummary = {
  name: string | null
  phone: string | null
  email: string | null
  orderCount: number
  wishlistCount: number
  totalSpent: number
  activeOrderCount: number
}

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'shipped'])

export async function getCustomerAccountSummary(tenantId: string, customerId: string): Promise<AccountSummary> {
  return withTenant(tenantId, async (db) => {
    const [customer, orders, wishlistCount] = await Promise.all([
      db.customer.findUnique({ where: { id: customerId }, select: { name: true, phone: true, email: true } }),
      db.order.findMany({ where: { tenantId, customerId }, select: { total: true, status: true } }),
      db.wishlist.count({ where: { tenantId, customerId } }),
    ])

    const totalSpent = orders.reduce((sum: number, o: { total: unknown }) => sum + Number(o.total), 0)
    const activeOrderCount = orders.filter((o: { status: string }) => ACTIVE_STATUSES.has(o.status)).length

    return {
      name: customer?.name ?? null,
      phone: customer?.phone ?? null,
      email: customer?.email ?? null,
      orderCount: orders.length,
      wishlistCount,
      totalSpent,
      activeOrderCount,
    }
  })
}
