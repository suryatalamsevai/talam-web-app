import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockSaveOnboarding } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockSaveOnboarding: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/onboarding', () => ({
  saveOnboarding: mockSaveOnboarding,
}))

import { POST } from './route'

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/store/onboarding', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/store/onboarding', () => {
  it('saves onboarding preferences for the authenticated user scoped to the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockSaveOnboarding.mockResolvedValue(undefined)

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredCategories: ['flowers', 'cakes'], preferredSize: 'medium' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { saved: true } })
    expect(mockSaveOnboarding).toHaveBeenCalledWith('tenant-a', 'user-1', {
      preferredCategories: ['flowers', 'cakes'],
      preferredSize: 'medium',
    })
  })

  it('defaults preferredSize to null when omitted', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockSaveOnboarding.mockResolvedValue(undefined)

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredCategories: [] }
      )
    )

    expect(res.status).toBe(200)
    expect(mockSaveOnboarding).toHaveBeenCalledWith('tenant-a', 'user-1', {
      preferredCategories: [],
      preferredSize: null,
    })
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(
      request({ authorization: 'Bearer valid-token' }, { preferredCategories: [] })
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockSaveOnboarding).not.toHaveBeenCalled()
  })

  it('400s when preferredCategories is missing from the body', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredSize: 'medium' }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockSaveOnboarding).not.toHaveBeenCalled()
  })

  it('400s when preferredCategories contains a non-string entry', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredCategories: ['flowers', 42] }
      )
    )

    expect(res.status).toBe(400)
    expect(mockSaveOnboarding).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request({ 'x-tenant-id': 'tenant-a' }, { preferredCategories: [] })
    )
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockSaveOnboarding).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request(
        { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredCategories: [] }
      )
    )

    expect(res.status).toBe(401)
  })

  it('404s when the lib function reports the customer was not found for the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockSaveOnboarding.mockRejectedValue(new Error('Customer not found'))

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { preferredCategories: [] }
      )
    )
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error.code).toBe('not_found')
  })

  it('tenant isolation: a token scoped to tenant A cannot save onboarding data for tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockSaveOnboarding.mockResolvedValue(undefined)

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, { preferredCategories: [] })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, { preferredCategories: [] })
    )

    expect(resA.status).toBe(200)
    expect(mockSaveOnboarding).toHaveBeenCalledWith('tenant-a', 'user-1', expect.any(Object))
    // The shared token doesn't resolve to a customer for tenant B — the route must not fall
    // back to tenant A's session or otherwise leak a write across the tenant boundary.
    expect(resB.status).toBe(401)
    expect(mockSaveOnboarding).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
