import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockGetTenantStorefront, mockGetStoreBanners } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockGetTenantStorefront: vi.fn(),
  mockGetStoreBanners: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/tenant')>('@/lib/data/tenant')
  return { ...actual, getTenantStorefront: mockGetTenantStorefront }
})
vi.mock('@/lib/data/storefront', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/storefront')>('@/lib/data/storefront')
  return { ...actual, getStoreBanners: mockGetStoreBanners }
})

import { GET } from './route'

function request(path: string, headers: Record<string, string>) {
  return new Request(`https://api.example.com${path}`, { headers })
}

const STOREFRONT = {
  id: 'tenant-a',
  ownerId: 'owner-1',
  name: 'D Mystique',
  tagline: 'Handpicked sarees',
  brandColor: '#9E2B2B',
  logoUrl: 'https://cdn.example.com/logo.png',
  whatsappNumber: '+919999999999',
  showWhatsappButton: true,
  contactPhone: '+919999999999',
  contactEmail: 'hello@dmystique.example',
  tier: 'trial',
  freeDeliveryAbove: 999,
  shippingFee: 49,
  deliveryEstimateText: '3-5 days',
  returnWindowDays: 7,
  trustBadgeText: 'Loved by 1000+ customers',
  sizeGuideUrl: null,
  about: null,
  branch: null,
}

const BANNER = {
  headline: null,
  subtitle: null,
  product: {
    name: 'Silk Saree',
    slug: 'silk-saree',
    price: 2999,
    comparePrice: 3999,
    sizes: ['Free'],
    images: ['https://cdn.example.com/saree.jpg'],
    category: { name: 'Sarees' },
    reviews: [{ rating: 5 }, { rating: 4 }],
  },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/store/config', () => {
  it('returns the tenant-scoped store config, shaped for mobile', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetTenantStorefront.mockResolvedValue(STOREFRONT)
    mockGetStoreBanners.mockResolvedValue([BANNER])

    const res = await GET(request('/api/v1/store/config', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toMatchObject({
      name: 'D Mystique',
      tagline: 'Handpicked sarees',
      logoUrl: 'https://cdn.example.com/logo.png',
      theme: { color: '#9E2B2B' },
      contactPhone: '+919999999999',
      contactEmail: 'hello@dmystique.example',
      policy: {
        freeDeliveryAbove: 999,
        shippingFee: 49,
        deliveryEstimateText: '3-5 days',
        returnWindowDays: 7,
        trustBadgeText: 'Loved by 1000+ customers',
      },
      banners: [
        {
          headline: 'Silk Saree',
          subtitle: 'Sarees',
          slug: 'silk-saree',
          price: 2999,
          comparePrice: 3999,
          reviewCount: 2,
          averageRating: 4.5,
        },
      ],
    })
    expect(Array.isArray(body.data.theme.presets)).toBe(true)
    expect(body.data.theme.presets.length).toBeGreaterThan(0)
    expect(mockGetTenantStorefront).toHaveBeenCalledWith('tenant-a')
    expect(mockGetStoreBanners).toHaveBeenCalledWith('tenant-a')
  })

  it('404s when the tenant has no storefront config', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockGetTenantStorefront.mockResolvedValue(null)
    mockGetStoreBanners.mockResolvedValue([])

    const res = await GET(request('/api/v1/store/config', { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/config', { authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockGetTenantStorefront).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request('/api/v1/store/config', { 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockGetTenantStorefront).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(
      request('/api/v1/store/config', { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A never returns tenant B config', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockGetTenantStorefront.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a' ? STOREFRONT : null
    )
    mockGetStoreBanners.mockResolvedValue([])

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await GET(request('/api/v1/store/config', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await GET(request('/api/v1/store/config', { authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect((await resA.json()).data.name).toBe('D Mystique')
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak config data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockGetTenantStorefront).not.toHaveBeenCalledWith('tenant-b')
  })
})
