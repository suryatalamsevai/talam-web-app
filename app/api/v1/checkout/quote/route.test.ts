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

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/checkout/quote', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/checkout/quote', () => {
  it('returns the priced quote for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockPriceCart.mockResolvedValue({
      tenantId: 'tenant-a',
      storeName: 'Silk Saree Co',
      coupon: null,
      lines: [{ productId: 'p1', productName: 'Silk Saree', size: 'M', quantity: 2, unitPrice: 100, compareAtPrice: null }],
      quote: { subtotal: 200, itemsTotal: 200, productDiscount: 0, couponDiscount: 0, shippingFee: 0, total: 200 },
    })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { cart: CART, couponCode: 'SAVE10' })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      data: {
        quote: { subtotal: 200, itemsTotal: 200, productDiscount: 0, couponDiscount: 0, shippingFee: 0, total: 200 },
        lines: [{ productId: 'p1', size: 'M', quantity: 2, unitPrice: 100 }],
      },
    })
    expect(mockPriceCart).toHaveBeenCalledWith('tenant-a', CART, 'SAVE10')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }, { cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockPriceCart).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }, { cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockPriceCart).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }, { cart: CART }))

    expect(res.status).toBe(401)
  })

  it('400s when priceCart reports a pricing error (e.g. empty cart)', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockPriceCart.mockResolvedValue({ error: 'Your cart is empty.' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { cart: [] }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(body.error.message).toBe('Your cart is empty.')
  })

  it('tenant isolation: a token scoped to tenant A never prices against tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockPriceCart.mockImplementation(async (tenantId: string) => ({
      tenantId,
      storeName: 'Tenant A Store',
      coupon: null,
      lines: [],
      quote: { subtotal: 0, itemsTotal: 0, productDiscount: 0, couponDiscount: 0, shippingFee: 0, total: 0 },
    }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { cart: CART }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { cart: CART }))

    expect(resA.status).toBe(200)
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak pricing across the boundary.
    expect(resB.status).toBe(401)
    expect(mockPriceCart).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
