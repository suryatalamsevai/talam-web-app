import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockGetCategories } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockGetCategories: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/products')>('@/lib/data/products')
  return { ...actual, getCategories: mockGetCategories }
})

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

const CATEGORY = { id: 'cat-1', name: 'Bouquets', slug: 'bouquets', department: 'flowers' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/categories', () => {
  it('returns the tenant-scoped category list, shaped for mobile', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetCategories.mockResolvedValue([CATEGORY])

    const res = await GET(request('/api/v1/store/categories', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      data: [{ id: 'cat-1', name: 'Bouquets', slug: 'bouquets', department: 'flowers' }],
    })
    expect(mockGetCategories).toHaveBeenCalledWith('tenant-a', undefined)
  })

  it('passes the department filter through from query params', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetCategories.mockResolvedValue([])

    await GET(
      request('/api/v1/store/categories?department=flowers', {
        authorization: 'Bearer valid-token',
        'x-tenant-id': 'tenant-a',
      })
    )

    expect(mockGetCategories).toHaveBeenCalledWith('tenant-a', 'flowers')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/categories', { authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockGetCategories).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/categories', { 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockGetCategories).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/categories', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A never returns tenant B categories', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockGetCategories.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? [CATEGORY] : []
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(request('/api/v1/store/categories', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(request('/api/v1/store/categories', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect((await resA.json()).data).toHaveLength(1)
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak category data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockGetCategories).not.toHaveBeenCalledWith('tenant-b', expect.anything())
  })
})
