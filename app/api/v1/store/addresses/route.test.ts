import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockCreateAddress } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockCreateAddress: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
vi.mock('@/lib/data/addresses', () => ({
  createAddress: mockCreateAddress,
}))

import { POST } from './route'

const VALID_ADDRESS = {
  label: 'Home',
  name: 'Jane Doe',
  line1: '123 Main St',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
  phone: '9999999999',
}

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/store/addresses', {
    method: 'POST',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/store/addresses', () => {
  it('creates the address for the authenticated user scoped to the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockCreateAddress.mockResolvedValue(undefined)

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        VALID_ADDRESS
      )
    )
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body).toEqual({ data: { created: true } })
    expect(mockCreateAddress).toHaveBeenCalledWith('tenant-a', 'user-1', {
      ...VALID_ADDRESS,
      line2: '',
      isDefault: false,
    })
  })

  it('passes through optional line2 and isDefault when provided', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockCreateAddress.mockResolvedValue(undefined)

    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        { ...VALID_ADDRESS, line2: 'Apt 4B', isDefault: true }
      )
    )

    expect(res.status).toBe(201)
    expect(mockCreateAddress).toHaveBeenCalledWith('tenant-a', 'user-1', {
      ...VALID_ADDRESS,
      line2: 'Apt 4B',
      isDefault: true,
    })
  })

  it('400s when the tenant cannot be resolved, without attempting auth', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(request({ authorization: 'Bearer valid-token' }, VALID_ADDRESS))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockCreateAddress).not.toHaveBeenCalled()
  })

  it('400s when a required field is missing from the body', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const missingPincode: Record<string, unknown> = { ...VALID_ADDRESS }
    delete missingPincode.pincode
    const res = await POST(
      request(
        { authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        missingPincode
      )
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockCreateAddress).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(request({ 'x-tenant-id': 'tenant-a' }, VALID_ADDRESS))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockCreateAddress).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      request(
        { authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a', 'content-type': 'application/json' },
        VALID_ADDRESS
      )
    )

    expect(res.status).toBe(401)
  })

  it('tenant isolation: a token scoped to tenant A cannot create an address for tenant B', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockCreateAddress.mockResolvedValue(undefined)

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' }, VALID_ADDRESS)
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(
      request({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' }, VALID_ADDRESS)
    )

    expect(resA.status).toBe(201)
    expect(mockCreateAddress).toHaveBeenCalledWith('tenant-a', 'user-1', expect.any(Object))
    // The shared token doesn't resolve to a customer for tenant B — the route must not fall
    // back to tenant A's session or otherwise leak a write across the tenant boundary.
    expect(resB.status).toBe(401)
    expect(mockCreateAddress).not.toHaveBeenCalledWith('tenant-b', expect.anything(), expect.anything())
  })
})
