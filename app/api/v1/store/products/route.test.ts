import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockGetProducts } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockGetProducts: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/products', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/products')>('@/lib/data/products')
  return { ...actual, getProducts: mockGetProducts }
})

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

const PRODUCT = {
  id: 'p1',
  name: 'Rose Bouquet',
  slug: 'rose-bouquet',
  description: 'Fresh roses',
  price: 499,
  comparePrice: 599,
  sizes: ['M'],
  images: ['img.jpg'],
  unit: 'PIECE',
  category: { name: 'Bouquets' },
  reviewCount: 3,
  averageRating: 4.5,
  isNew: false,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/products', () => {
  it('returns the tenant-scoped product list, shaped for mobile', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetProducts.mockResolvedValue([PRODUCT])

    const res = await GET(request('/api/v1/store/products', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      data: [
        {
          id: 'p1',
          name: 'Rose Bouquet',
          slug: 'rose-bouquet',
          description: 'Fresh roses',
          price: 499,
          comparePrice: 599,
          category: 'Bouquets',
          sizes: ['M'],
          images: ['img.jpg'],
          unit: 'PIECE',
          reviewCount: 3,
          averageRating: 4.5,
          isNew: false,
        },
      ],
    })
    expect(mockGetProducts).toHaveBeenCalledWith('tenant-a', {
      categoryId: undefined,
      department: undefined,
      offersOnly: undefined,
      size: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: undefined,
      tagId: undefined,
    })
  })

  it('parses filters from query params', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetProducts.mockResolvedValue([])

    await GET(
      request(
        '/api/v1/store/products?categoryId=cat-1&department=flowers&offersOnly=true&size=M&minPrice=100&maxPrice=900&sort=price-asc&tagId=tag-1',
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }
      )
    )

    expect(mockGetProducts).toHaveBeenCalledWith('tenant-a', {
      categoryId: 'cat-1',
      department: 'flowers',
      offersOnly: true,
      size: 'M',
      minPrice: 100,
      maxPrice: 900,
      sort: 'price-asc',
      tagId: 'tag-1',
    })
  })

  it('ignores an unrecognized sort value rather than passing it through', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetProducts.mockResolvedValue([])

    await GET(request('/api/v1/store/products?sort=not-a-real-sort', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))

    expect(mockGetProducts).toHaveBeenCalledWith('tenant-a', expect.objectContaining({ sort: undefined }))
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/products', { authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockGetProducts).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/products', { 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockGetProducts).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/products', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A never returns tenant B products', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockGetProducts.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? [PRODUCT] : []
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(request('/api/v1/store/products', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(request('/api/v1/store/products', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect((await resA.json()).data).toHaveLength(1)
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak product data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockGetProducts).not.toHaveBeenCalledWith('tenant-b', expect.anything())
  })
})
