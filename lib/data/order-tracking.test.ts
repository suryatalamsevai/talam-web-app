import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetCustomerOrder, mockGetShiprocketTracking } = vi.hoisted(() => ({
  mockGetCustomerOrder: vi.fn(),
  mockGetShiprocketTracking: vi.fn(),
}))

vi.mock('@/lib/data/storefront-orders', () => ({
  getCustomerOrder: mockGetCustomerOrder,
}))
vi.mock('@/lib/shipping/shiprocket', () => ({
  getShiprocketTracking: mockGetShiprocketTracking,
}))

import { getOrderTracking } from './order-tracking'

const SHIPPED_ORDER = {
  id: 'order-1',
  code: '#ORDER-1',
  status: 'shipped',
  trackingId: 'AWB123',
}

const SHIPMENT = {
  awbCode: 'AWB123',
  currentStatus: 'In Transit',
  courierName: 'Delhivery',
  estimatedDeliveryDate: '2026-09-05',
  trackUrl: 'https://shiprocket.co/tracking/AWB123',
  activities: [{ date: '2026-09-02 10:00:00', activity: 'Shipment picked up', location: 'Bengaluru' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getOrderTracking', () => {
  it('returns live Shiprocket scans when the order has an AWB', async () => {
    mockGetCustomerOrder.mockResolvedValue(SHIPPED_ORDER)
    mockGetShiprocketTracking.mockResolvedValue(SHIPMENT)

    expect(await getOrderTracking('tenant-a', 'cust-1', 'order-1')).toEqual({
      orderId: 'order-1',
      code: '#ORDER-1',
      status: 'shipped',
      trackingId: 'AWB123',
      source: 'shiprocket',
      shipment: SHIPMENT,
    })
    expect(mockGetShiprocketTracking).toHaveBeenCalledWith('tenant-a', 'AWB123')
  })

  it('reads the order ownership-scoped rather than re-implementing the query', async () => {
    mockGetCustomerOrder.mockResolvedValue(SHIPPED_ORDER)
    mockGetShiprocketTracking.mockResolvedValue(SHIPMENT)

    await getOrderTracking('tenant-a', 'cust-1', 'order-1')

    expect(mockGetCustomerOrder).toHaveBeenCalledWith('tenant-a', 'cust-1', 'order-1')
  })

  it('returns null when the order is missing or belongs to another customer', async () => {
    mockGetCustomerOrder.mockResolvedValue(null)

    expect(await getOrderTracking('tenant-a', 'cust-2', 'order-1')).toBeNull()
    expect(mockGetShiprocketTracking).not.toHaveBeenCalled()
  })

  it('falls back to the stored status without calling Shiprocket when there is no AWB yet', async () => {
    mockGetCustomerOrder.mockResolvedValue({ ...SHIPPED_ORDER, status: 'confirmed', trackingId: null })

    expect(await getOrderTracking('tenant-a', 'cust-1', 'order-1')).toEqual({
      orderId: 'order-1',
      code: '#ORDER-1',
      status: 'confirmed',
      trackingId: null,
      source: 'order_status',
      shipment: null,
    })
    expect(mockGetShiprocketTracking).not.toHaveBeenCalled()
  })

  it('falls back to the stored status when the Shiprocket call throws', async () => {
    mockGetCustomerOrder.mockResolvedValue(SHIPPED_ORDER)
    mockGetShiprocketTracking.mockRejectedValue(new Error('Shiprocket tracking lookup failed (503): down'))

    const tracking = await getOrderTracking('tenant-a', 'cust-1', 'order-1')

    expect(tracking).toEqual({
      orderId: 'order-1',
      code: '#ORDER-1',
      status: 'shipped',
      trackingId: 'AWB123',
      source: 'order_status',
      shipment: null,
    })
  })

  it('falls back to the stored status when the Shiprocket call times out', async () => {
    mockGetCustomerOrder.mockResolvedValue(SHIPPED_ORDER)
    const timeout = new Error('The operation was aborted due to timeout')
    timeout.name = 'TimeoutError'
    mockGetShiprocketTracking.mockRejectedValue(timeout)

    const tracking = await getOrderTracking('tenant-a', 'cust-1', 'order-1')

    expect(tracking?.source).toBe('order_status')
    expect(tracking?.trackingId).toBe('AWB123')
    expect(tracking?.status).toBe('shipped')
  })

  it('falls back to the stored status when Shiprocket has no scans for the AWB yet', async () => {
    mockGetCustomerOrder.mockResolvedValue(SHIPPED_ORDER)
    mockGetShiprocketTracking.mockResolvedValue(null)

    const tracking = await getOrderTracking('tenant-a', 'cust-1', 'order-1')

    expect(tracking?.source).toBe('order_status')
    expect(tracking?.shipment).toBeNull()
  })

  it('tenant isolation: the tenant id is threaded through to both the order read and Shiprocket', async () => {
    mockGetCustomerOrder.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? SHIPPED_ORDER : null
    )
    mockGetShiprocketTracking.mockResolvedValue(SHIPMENT)

    expect(await getOrderTracking('tenant-b', 'cust-1', 'order-1')).toBeNull()
    expect(mockGetShiprocketTracking).not.toHaveBeenCalled()

    await getOrderTracking('tenant-a', 'cust-1', 'order-1')
    expect(mockGetShiprocketTracking).toHaveBeenCalledWith('tenant-a', 'AWB123')
  })
})
