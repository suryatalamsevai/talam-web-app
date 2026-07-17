import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      customer: {
        findUnique: vi.fn().mockResolvedValue({
          name: 'Priya Rajan',
          phone: '+91 98765 43210',
          email: 'priya.rajan@gmail.com',
        }),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([
          { total: '2998.00', status: 'delivered' },
          { total: '1899.00', status: 'shipped' },
        ]),
      },
      wishlist: {
        count: vi.fn().mockResolvedValue(12),
      },
    })
  ),
}))

import { getCustomerAccountSummary } from './customer-account'

describe('getCustomerAccountSummary', () => {
  it('aggregates profile, order stats, and wishlist count', async () => {
    const summary = await getCustomerAccountSummary('tenant-1', 'customer-1')

    expect(summary.name).toBe('Priya Rajan')
    expect(summary.orderCount).toBe(2)
    expect(summary.totalSpent).toBe(4897)
    expect(summary.activeOrderCount).toBe(1)
    expect(summary.wishlistCount).toBe(12)
  })
})
