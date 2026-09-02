import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockUpdateCustomerProfile } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockUpdateCustomerProfile: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/customer-profile', () => ({
  updateCustomerProfile: mockUpdateCustomerProfile,
}))

import { PATCH } from './route'

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/store/profile', {
    method: 'PATCH',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('PATCH /api/v1/store/profile', () => {
  it('updates the profile for the authenticated user scoped to the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUpdateCustomerProfile.mockResolvedValue(undefined)

    const res = await PATCH(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { name: 'Jane Doe', phone: '9999999999' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { updated: true } })
    expect(mockUpdateCustomerProfile).toHaveBeenCalledWith('tenant-a', 'user-1', {
      name: 'Jane Doe',
      phone: '9999999999',
    })
  })

  it('defaults phone to an empty string when omitted', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUpdateCustomerProfile.mockResolvedValue(undefined)

    const res = await PATCH(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { name: 'Jane Doe' }
      )
    )

    expect(res.status).toBe(200)
    expect(mockUpdateCustomerProfile).toHaveBeenCalledWith('tenant-a', 'user-1', {
      name: 'Jane Doe',
      phone: '',
    })
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await PATCH(request({ authorization: 'Bearer valid-token' }, { name: 'Jane Doe' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled()
  })

  it('400s when name is missing from the body', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await PATCH(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { phone: '9999999999' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await PATCH(request({ 'x-tenant-id': 'tenant-a' }, { name: 'Jane Doe' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await PATCH(
      request(
        { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { name: 'Jane Doe' }
      )
    )

    expect(res.status).toBe(401)
  })

  it('404s when the lib function reports the customer was not found for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUpdateCustomerProfile.mockRejectedValue(new Error('Customer not found'))

    const res = await PATCH(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { name: 'Jane Doe' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('tenant isolation: a token scoped to tenant A cannot update tenant B customer data', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockUpdateCustomerProfile.mockResolvedValue(undefined)

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await PATCH(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { name: 'Jane Doe' })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await PATCH(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { name: 'Jane Doe' })
    )

    expect(resA.status).toBe(200)
    expect(mockUpdateCustomerProfile).toHaveBeenCalledWith('tenant-a', 'user-1', expect.any(Object))
    // The shared token doesn't resolve to a customer for tenant B — the route must not fall
    // back to tenant A's session or otherwise leak a write across the tenant boundary.
    expect(resB.status).toBe(401)
    expect(mockUpdateCustomerProfile).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
