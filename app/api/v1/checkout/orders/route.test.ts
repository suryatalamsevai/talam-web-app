import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockPlaceOrder } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockPlaceOrder: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/checkout', () => ({
  placeOrder: mockPlaceOrder,
}))

import { POST } from './route'

const CART = [{ productId: 'p1', size: 'M', quantity: 2 }]

const ADDRESS = {
  name: 'Priya',
  phone: '9876543210',
  line1: '42 Bharathi Nagar',
  city: 'Madurai',
  state: 'Tamil Nadu',
  pincode: '625001',
}

const BODY = {
  cart: CART,
  paymentProvider: 'cod',
  email: 'priya@example.com',
  address: ADDRESS,
}

function request(headers: Record<string, string>, body: unknown = BODY) {
  return new Request('https://api.example.com/api/v1/checkout/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

const AUTHED = { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
  mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
  mockPlaceOrder.mockResolvedValue({ orderId: 'order-1', customerId: 'user-1', isGuest: false })
})

describe('POST /api/v1/checkout/orders', () => {
  it('places the order for the resolved tenant and bearer-authenticated user', async () => {
    const res = await POST(request(AUTHED))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ data: { orderId: 'order-1' } })
    expect(mockPlaceOrder).toHaveBeenCalledWith(
      'tenant-a',
      { id: 'user-1' },
      {
        cart: [{ productId: 'p1', size: 'M', quantity: 2 }],
        couponCode: undefined,
        paymentProvider: 'cod',
        email: 'priya@example.com',
        addressId: undefined,
        address: { ...ADDRESS, line2: '' },
        utr: undefined,
        paymentProofUrl: undefined,
      }
    )
  })

  it('always passes an authenticated user through — the guest path is never reachable over the API', async () => {
    await POST(request(AUTHED))

    const [, user] = mockPlaceOrder.mock.calls[0]
    expect(user).not.toBeNull()
    expect(user).toEqual({ id: 'user-1' })
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockPlaceOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing, without placing an order', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockPlaceOrder).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired, without placing an order', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }))

    expect(res.status).toBe(401)
    expect(mockPlaceOrder).not.toHaveBeenCalled()
  })

  it('tenant isolation: a token scoped to tenant A never places an order on tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(201)
    expect(resB.status).toBe(401)
    // The tenant id the order is filed under always comes from the resolved tenant that
    // auth was checked against — never from the request body or a prior call.
    expect(mockPlaceOrder).toHaveBeenCalledTimes(1)
    expect(mockPlaceOrder).toHaveBeenCalledWith('tenant-a', expect.anything(), expect.anything())
    expect(mockPlaceOrder).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })

  it('400s with an out_of_stock reason when the transaction loses a stock race', async () => {
    mockPlaceOrder.mockResolvedValue({ error: 'Silk Saree (M) just went out of stock.', reason: 'out_of_stock' })

    const res = await POST(request(AUTHED))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toEqual({
      code: 'invalid_request',
      message: 'Silk Saree (M) just went out of stock.',
      details: { reason: 'out_of_stock' },
    })
  })

  it('400s with invalid_request when a UPI order has neither a valid UTR nor a payment proof', async () => {
    mockPlaceOrder.mockResolvedValue({
      error: 'Enter the 12-digit UPI reference number, or upload a payment screenshot.',
    })

    const res = await POST(request(AUTHED, { ...BODY, paymentProvider: 'upi_manual', utr: '123' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(body.error.message).toBe('Enter the 12-digit UPI reference number, or upload a payment screenshot.')
    expect(body.error.details).toBeUndefined()
  })

  it('400s on a malformed payload without reaching the order logic', async () => {
    const res = await POST(request(AUTHED, { ...BODY, cart: [], paymentProvider: 'bitcoin' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockPlaceOrder).not.toHaveBeenCalled()
  })
})
