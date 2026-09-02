import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockVerifySignature, mockUpdateMany } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockVerifySignature: vi.fn(),
  mockUpdateMany: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
// Same pattern as app/checkout/actions.test.ts — the HMAC itself is mocked, so no real key
// secret is needed and no fixed secret is committed for tests to hash against.
vi.mock('@/lib/payments/razorpay', () => ({
  verifyRazorpaySignature: mockVerifySignature,
}))
vi.mock('@/lib/prisma', () => ({
  prisma: { order: { updateMany: mockUpdateMany } },
  withTenant: (_tenantId: string, fn: (db: { order: { updateMany: typeof mockUpdateMany } }) => unknown) =>
    fn({ order: { updateMany: mockUpdateMany } }),
}))

// The real lib/checkout/verify-razorpay-payment.ts runs here on purpose, so these tests prove
// the actual signature gate in front of the database write rather than a stubbed stand-in.
import { POST } from './route'

const VALID_BODY = {
  orderId: 'order-1',
  razorpayOrderId: 'rzp_order_1',
  razorpayPaymentId: 'pay_1',
  signature: 'sig',
}

function request(headers: Record<string, string>, body: unknown = VALID_BODY) {
  return new Request('https://api.example.com/api/v1/checkout/razorpay/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockVerifySignature.mockReturnValue(true)
  mockUpdateMany.mockResolvedValue({ count: 1 })
})

describe('POST /api/v1/checkout/razorpay/verify', () => {
  it('marks the order paid for the resolved tenant and bearer-authenticated customer', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })

    const res = await POST(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { ok: true } })
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', tenantId: 'tenant-a', customerId: 'cust-1' },
      data: { paymentStatus: 'paid', paymentId: 'pay_1', status: 'confirmed' },
    })
  })

  it('is idempotent: a repeated call re-asserts the same state and succeeds again', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })

    const headers = { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }
    const first = await POST(request(headers))
    const second = await POST(request(headers))

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toEqual({ data: { ok: true } })
    expect(mockUpdateMany).toHaveBeenCalledTimes(2)
    expect(mockUpdateMany.mock.calls[0]).toEqual(mockUpdateMany.mock.calls[1])
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }))

    expect(res.status).toBe(401)
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('400s when required payment fields are missing, before touching the database', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { orderId: 'order-1' })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockVerifySignature).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('rejects an unverified signature and never mutates payment state', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockVerifySignature.mockReturnValue(false)

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { ...VALID_BODY, signature: 'forged' })
    )
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('404s when the order is not owned by the authenticated customer', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, { ...VALID_BODY, orderId: 'someone-elses-order' })
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('tenant isolation: a token scoped to tenant A can never confirm payment on tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'cust-1' } : null
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(401)
    expect(mockUpdateMany).toHaveBeenCalledTimes(1)
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) })
    )
  })
})
