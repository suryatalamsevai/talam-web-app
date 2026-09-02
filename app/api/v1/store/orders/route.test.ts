import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockListCustomerOrders } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockListCustomerOrders: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/storefront-orders', () => ({
  listCustomerOrders: mockListCustomerOrders,
}))

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/orders', () => {
  it('returns the authenticated customer\'s orders for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockListCustomerOrders.mockResolvedValue([{ id: 'order-1', code: '#ORDER123' }])

    const res = await GET(request('/api/v1/store/orders', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: [{ id: 'order-1', code: '#ORDER123' }] })
    expect(mockListCustomerOrders).toHaveBeenCalledWith('tenant-a', 'user-1')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/orders', { authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockListCustomerOrders).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/orders', { 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockListCustomerOrders).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/orders', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
    expect(mockListCustomerOrders).not.toHaveBeenCalled()
  })

  it('tenant isolation: a token scoped to tenant A never triggers a call scoped to tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockListCustomerOrders.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? [{ id: 'order-1', code: '#TENANTA1' }] : []
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(request('/api/v1/store/orders', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(request('/api/v1/store/orders', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect((await resA.json()).data).toEqual([{ id: 'order-1', code: '#TENANTA1' }])
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak order data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockListCustomerOrders).not.toHaveBeenCalledWith('tenant-b', expect.anything())
  })
})
