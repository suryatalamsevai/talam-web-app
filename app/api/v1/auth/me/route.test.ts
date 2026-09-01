import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRequireApiUser } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))

import { GET } from './route'

function request(headers: Record<string, string>) {
  return new Request('https://api.example.com/api/v1/auth/me', { headers })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/v1/auth/me', () => {
  it('returns the authenticated user scoped to the requested tenant', async () => {
    mockRequireApiUser.mockResolvedValue({ id: 'user-1', email: 'a@example.com', phone: null })

    const res = await GET(request({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ id: 'user-1', email: 'a@example.com', phone: null, tenantId: 'tenant-a' })
    expect(mockRequireApiUser).toHaveBeenCalledWith(expect.any(Request), 'tenant-a')
  })

  it('400s when x-tenant-id is missing, without attempting auth', async () => {
    const res = await GET(request({ authorization: 'Bearer valid-token' }))

    expect(res.status).toBe(400)
    expect(mockRequireApiUser).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request({ 'x-tenant-id': 'tenant-a' }))

    expect(res.status).toBe(401)
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await GET(request({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' }))

    expect(res.status).toBe(401)
  })

  it('tenant isolation: the same token resolves independently per tenant header, never mixing responses', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1', email: 'a@example.com', phone: null } : null
    )

    const resA = await GET(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }))
    const resB = await GET(request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }))

    expect(resA.status).toBe(200)
    expect((await resA.json()).tenantId).toBe('tenant-a')
    // Tenant B has no matching customer for this user in this scenario — the route must not
    // fall back to tenant A's identity or otherwise leak it across the tenant boundary.
    expect(resB.status).toBe(401)
    expect(mockRequireApiUser).toHaveBeenNthCalledWith(1, expect.any(Request), 'tenant-a')
    expect(mockRequireApiUser).toHaveBeenNthCalledWith(2, expect.any(Request), 'tenant-b')
  })
})
