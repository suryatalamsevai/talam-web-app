import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockGetCustomerOrder } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockGetCustomerOrder: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/storefront-orders', () => ({
  getCustomerOrder: mockGetCustomerOrder,
}))

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/orders/[id]', () => {
  it('returns the order for the resolved tenant and authenticated customer', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'customer-1' })
    mockGetCustomerOrder.mockResolvedValue({ id: 'order-1', code: '#ORDER1', status: 'pending' })

    const res = await GET(
      request('/api/v1/store/orders/order-1', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }),
      ctx('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { id: 'order-1', code: '#ORDER1', status: 'pending' } })
    expect(mockGetCustomerOrder).toHaveBeenCalledWith('tenant-a', 'customer-1', 'order-1')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders/order-1', { authorization: 'Bearer valid-token' }),
      ctx('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockGetCustomerOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders/order-1', { 'x-tenant-id': 'tenant-a' }),
      ctx('order-1')
    )
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockGetCustomerOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders/order-1', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }),
      ctx('order-1')
    )

    expect(res.status).toBe(401)
  })

  it('404s when the order does not exist', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'customer-1' })
    mockGetCustomerOrder.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders/missing-order', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }),
      ctx('missing-order')
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('404s (not the other customer\'s order) when a valid token for tenant/customer A requests an order belonging to a different customer', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'customer-a' })
    // getCustomerOrder is scoped by customerId internally, so a guessed id belonging to
    // customer B resolves to null for customer A's token rather than returning the order.
    mockGetCustomerOrder.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders/order-owned-by-b', {
        authorization: 'Bearer customer-a-token',
        'x-tenant-id': 'tenant-a',
      }),
      ctx('order-owned-by-b')
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
    expect(mockGetCustomerOrder).toHaveBeenCalledWith('tenant-a', 'customer-a', 'order-owned-by-b')
  })

  it('tenant isolation: a token scoped to tenant A never reads tenant B order data', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'customer-1' } : null
    )
    mockGetCustomerOrder.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'order-1', code: '#ORDER1', status: 'pending' } : null
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(
      request('/api/v1/store/orders/order-1', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }),
      ctx('order-1')
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(
      request('/api/v1/store/orders/order-1', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }),
      ctx('order-1')
    )

    expect(resA.status).toBe(200)
    expect((await resA.json()).data).toEqual({ id: 'order-1', code: '#ORDER1', status: 'pending' })
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak order data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockGetCustomerOrder).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
