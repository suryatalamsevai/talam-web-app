import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: { order: { findFirst: vi.fn(), update: vi.fn() }, orderStatusEvent: { create: vi.fn() } },
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))

import { updateOrderStatus } from './orders'

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.order.findFirst.mockResolvedValue({ status: 'confirmed' })
})

describe('updateOrderStatus', () => {
  it('stores the Shiprocket ids and courier alongside the AWB', async () => {
    await updateOrderStatus('t1', 'o1', 'shipped', 'AWB123', undefined, {
      shiprocketOrderId: '555',
      shipmentId: '999',
      courierName: 'Delhivery',
    })

    expect(mockDb.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trackingId: 'AWB123',
          shiprocketOrderId: '555',
          shipmentId: '999',
          courierName: 'Delhivery',
        }),
      })
    )
  })

  it('leaves the Shiprocket columns alone when the AWB was typed in by hand', async () => {
    await updateOrderStatus('t1', 'o1', 'shipped', 'MANUAL-AWB')

    const { data } = mockDb.order.update.mock.calls[0][0]
    expect(data).toEqual({ trackingId: 'MANUAL-AWB', status: 'shipped' })
  })
})
