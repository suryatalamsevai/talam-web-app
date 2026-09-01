import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockComputeUpiQr } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockComputeUpiQr: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/checkout/upi-qr', () => ({
  computeUpiQr: mockComputeUpiQr,
}))

import { POST } from './route'

const CART = [{ productId: 'p1', size: 'M', quantity: 2 }]

function request(headers: Record<string, string>, body: unknown) {
  return new Request('https://api.example.com/api/v1/checkout/upi-qr', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/checkout/upi-qr', () => {
  it('returns the UPI intent and QR svg for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockComputeUpiQr.mockResolvedValue({
      intent: 'upi://pay?pa=store%40upi&pn=Meena+Silks&am=1899.00&tn=Order+at+Meena+Silks&cu=INR',
      svgDataUri: 'data:image/svg+xml;base64,PHN2ZyAvPg==',
      total: 1899,
      vpa: 'store@upi',
    })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { cart: CART, couponCode: 'fest10' })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.vpa).toBe('store@upi')
    expect(body.data.total).toBe(1899)
    expect(body.data.svgDataUri).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(mockComputeUpiQr).toHaveBeenCalledWith('tenant-a', CART, 'fest10')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }, { cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockComputeUpiQr).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }, { cart: CART }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockComputeUpiQr).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }, { cart: CART })
    )

    expect(res.status).toBe(401)
  })

  it('surfaces a validation error from computeUpiQr as 400 invalid_request', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockComputeUpiQr.mockResolvedValue({ error: 'This store has not set up UPI payments yet.' })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { cart: CART })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(body.error.message).toBe('This store has not set up UPI payments yet.')
  })

  it('400s when the request body is missing a cart', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, {}))

    expect(res.status).toBe(400)
    expect(mockComputeUpiQr).not.toHaveBeenCalled()
  })

  it('tenant isolation: a token scoped to tenant A never generates a QR for tenant B data', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockComputeUpiQr.mockImplementation(async (tenantId: string) =>
      tenantId === 'tenant-a'
        ? { intent: 'upi://pay?pa=a%40upi', svgDataUri: 'data:image/svg+xml;base64,QQ==', total: 100, vpa: 'a@upi' }
        : { error: 'unreachable' }
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { cart: CART }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { cart: CART }))

    expect(resA.status).toBe(200)
    // Tenant B's customer row doesn't exist for this token in this scenario — the route must
    // not fall back to tenant A's session or otherwise leak payment config across the boundary.
    expect(resB.status).toBe(401)
    expect(mockComputeUpiQr).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
