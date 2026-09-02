import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockToggleWishlist } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockToggleWishlist: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/wishlist', () => ({
  toggleWishlist: mockToggleWishlist,
}))

import { POST } from './route'

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/store/wishlist', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/store/wishlist', () => {
  it('toggles the wishlist entry for the authenticated user scoped to the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockToggleWishlist.mockResolvedValue(true)

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' }, {
        productId: 'product-1',
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { saved: true } })
    expect(mockToggleWishlist).toHaveBeenCalledWith('tenant-a', 'user-1', 'product-1')
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }, { productId: 'product-1' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockToggleWishlist).not.toHaveBeenCalled()
  })

  it('400s when productId is missing from the body', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(
      request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' }, {})
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockToggleWishlist).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }, { productId: 'product-1' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockToggleWishlist).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request(
        { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { productId: 'product-1' }
      )
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A cannot toggle a wishlist entry for tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockToggleWishlist.mockResolvedValue(true)

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { productId: 'product-1' })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { productId: 'product-1' })
    )

    expect(resA.status).toBe(200)
    expect(mockToggleWishlist).toHaveBeenCalledWith('tenant-a', 'user-1', 'product-1')
    // The shared token doesn't resolve to a customer for tenant B — the route must not fall
    // back to tenant A's session or otherwise leak a write across the tenant boundary.
    expect(resB.status).toBe(401)
    expect(mockToggleWishlist).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
