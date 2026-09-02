import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockCreateRazorpayOrderForOrder } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockCreateRazorpayOrderForOrder: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/payments/razorpay-order', () => ({
  createRazorpayOrderForOrder: mockCreateRazorpayOrderForOrder,
}))

import { POST } from './route'

function request(headers: Record<string, string>, body: unknown = { orderId: 'order-1' }) {
  return new Request('https://api.example.com/api/v1/checkout/razorpay/order', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const TENANT_A = { id: 'tenant-a', slug: 'a', tier: 'trial' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/checkout/razorpay/order', () => {
  it('creates a Razorpay order for the authenticated customer', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockCreateRazorpayOrderForOrder.mockResolvedValue({
      razorpayOrderId: 'rzp_order_1',
      keyId: 'rzp_test_key',
      amountPaise: 129900,
    })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      data: { razorpayOrderId: 'rzp_order_1', keyId: 'rzp_test_key', amountPaise: 129900 },
    })
    expect(mockCreateRazorpayOrderForOrder).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      customerId: 'user-1',
      orderId: 'order-1',
    })
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockCreateRazorpayOrderForOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockCreateRazorpayOrderForOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }))

    expect(res.status).toBe(401)
    expect(mockCreateRazorpayOrderForOrder).not.toHaveBeenCalled()
  })

  it('400s when orderId is missing from the body', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, {}))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockCreateRazorpayOrderForOrder).not.toHaveBeenCalled()
  })

  it('404s when the order exists but belongs to another customer', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue({ id: 'other-user' })
    // The shared function only matches on tenantId + customerId, so someone else's order is
    // indistinguishable from a missing one — the route must not leak that it exists.
    mockCreateRazorpayOrderForOrder.mockResolvedValue({ error: 'Order not found.', reason: 'order_not_found' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
    expect(body.error.message).toBe('Order not found.')
    expect(mockCreateRazorpayOrderForOrder).toHaveBeenCalledWith({
      tenantId: 'tenant-a',
      customerId: 'other-user',
      orderId: 'order-1',
    })
  })

  it('404s when the order does not exist at all', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockCreateRazorpayOrderForOrder.mockResolvedValue({ error: 'Order not found.', reason: 'order_not_found' })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { orderId: 'nope' })
    )

    expect(res.status).toBe(404)
    expect((await res.json()).error.code).toBe('not_found')
  })

  it('500s when Razorpay keys are not configured', async () => {
    mockResolveTenantForApi.mockResolvedValue(TENANT_A)
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockCreateRazorpayOrderForOrder.mockResolvedValue({
      error: 'Card & netbanking payments are not available right now.',
      reason: 'payments_unavailable',
    })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('internal_error')
  })

  it('tenant isolation: a token scoped to tenant A cannot mint an order against tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockCreateRazorpayOrderForOrder.mockResolvedValue({
      razorpayOrderId: 'rzp_order_1',
      keyId: 'rzp_test_key',
      amountPaise: 129900,
    })

    mockResolveTenantForApi.mockResolvedValueOnce(TENANT_A)
    const resA = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    // Tenant B has no customer row for this token — the route must reject rather than fall
    // back to tenant A's identity, and must never reach the Razorpay-order creation path.
    expect(resB.status).toBe(401)
    expect(mockCreateRazorpayOrderForOrder).toHaveBeenCalledTimes(1)
    expect(mockCreateRazorpayOrderForOrder).not.toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-b' })
    )
  })
})
