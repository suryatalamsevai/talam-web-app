import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockSearchProducts } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockSearchProducts: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/search', () => ({
  searchProducts: mockSearchProducts,
}))

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/search', () => {
  it('returns matching products for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockSearchProducts.mockResolvedValue([{ id: 'p1', name: 'Rose Bouquet' }])

    const res = await GET(
      request('/api/v1/store/search?q=rose', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: [{ id: 'p1', name: 'Rose Bouquet' }] })
    expect(mockSearchProducts).toHaveBeenCalledWith('tenant-a', 'rose')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/search?q=rose', { authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockSearchProducts).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/search?q=rose', { 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockSearchProducts).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/search?q=rose', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A never returns tenant B results', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockSearchProducts.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? [{ id: 'p1', name: 'Tenant A product' }] : []
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(
      request('/api/v1/store/search?q=rose', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(
      request('/api/v1/store/search?q=rose', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' })
    )

    expect(resA.status).toBe(200)
    expect((await resA.json()).data).toEqual([{ id: 'p1', name: 'Tenant A product' }])
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak product data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockSearchProducts).not.toHaveBeenCalledWith('tenant-b', expect.anything())
  })
})
