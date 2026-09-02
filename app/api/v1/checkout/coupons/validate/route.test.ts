import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockPriceCart } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockPriceCart: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/checkout/price-cart', async () => {
  const actual = await vi.importActual<typeof import('@/lib/checkout/price-cart')>('@/lib/checkout/price-cart')
  return {
    ...actual,
    priceCart: mockPriceCart,
  }
})

import { POST } from './route'

const CART = [{ productId: 'p1', size: 'M', quantity: 2 }]

function request(headers: Record<string, string>, body: unknown) {
  return new Request('https://api.example.com/api/v1/checkout/coupons/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/checkout/coupons/validate', () => {
  it('returns the priced quote and normalized coupon code for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockPriceCart.mockResolvedValue({
      tenantId: 'tenant-a',
      storeName: 'Meena Silks',
      coupon: { id: 'd1', code: 'FEST10' },
      lines: [{ productId: 'p1', productName: 'Silk Saree', size: 'M', quantity: 2, unitPrice: 1000, compareAtPrice: null }],
      quote: { itemsTotal: 2000, shippingFee: 99, couponDiscount: 200, total: 1899 },
    })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { code: 'fest10', cart: CART })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.code).toBe('FEST10')
    expect(body.data.quote.total).toBe(1899)
    expect(body.data.lines).toEqual([{ productId: 'p1', size: 'M', quantity: 2, unitPrice: 1000 }])
    expect(mockPriceCart).toHaveBeenCalledWith('tenant-a', CART, 'fest10')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }, { code: 'fest10', cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockPriceCart).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }, { code: 'fest10', cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockPriceCart).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }, { code: 'fest10', cart: CART })
    )

    expect(res.status).toBe(401)
  })

  it('surfaces a validation error from priceCart as 400 invalid_request', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockPriceCart.mockResolvedValue({ error: 'That coupon code is not valid.' })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { code: 'NOPE', cart: CART })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(body.error.message).toBe('That coupon code is not valid.')
  })

  it('400s when the request body is missing a code or cart', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { cart: CART }))

    expect(res.status).toBe(400)
    expect(mockPriceCart).not.toHaveBeenCalled()
  })

  it('tenant isolation: a token scoped to tenant A never validates against tenant B data', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockPriceCart.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a'
        ? {
            tenantId: 'tenant-a',
            storeName: 'Tenant A Store',
            coupon: { id: 'd1', code: 'FEST10' },
            lines: [],
            quote: { itemsTotal: 0, shippingFee: 0, couponDiscount: 0, total: 0 },
          }
        : { error: 'unreachable' }
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { code: 'fest10', cart: CART })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { code: 'fest10', cart: CART })
    )

    expect(resA.status).toBe(200)
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak coupon/pricing data across the boundary.
    expect(resB.status).toBe(401)
    expect(mockPriceCart).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
