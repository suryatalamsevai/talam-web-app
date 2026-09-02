import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRequireApiUser, mockResolveTenantForApi, mockReportOrderProblem } = vi.hoisted(() => ({
  mockRequireApiUser: vi.fn(),
  mockResolveTenantForApi: vi.fn(),
  mockReportOrderProblem: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireApiUser: mockRequireApiUser }))
vi.mock('@/lib/tenant', () => ({ resolveTenantForApi: mockResolveTenantForApi }))
vi.mock('@/lib/data/storefront-orders', () => ({ reportOrderProblem: mockReportOrderProblem }))

import { POST } from './route'

function request(headers: Record<string, string>, body?: unknown) {
  return new Request('https://api.example.com/api/v1/store/orders/o1/report', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function call(headers: Record<string, string>, body: unknown, orderId = 'o1') {
  return POST(request(headers, body), { params: Promise.resolve({ id: orderId }) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
})

describe('POST /api/v1/store/orders/[id]/report', () => {
  it('flags the order for the authenticated customer', async () => {
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockReportOrderProblem.mockResolvedValue({})

    const res = await call({ authorization: 'Bearer valid-token' }, { reason: 'Never received it' })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({ data: { ok: true } })
    expect(mockReportOrderProblem).toHaveBeenCalledWith('tenant-a', 'cust-1', 'o1', 'Never received it')
  })

  it('401s when the bearer token is missing', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await call({}, { reason: 'x' })

    expect(res.status).toBe(401)
    expect(mockReportOrderProblem).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockRequireApiUser.mockResolvedValue(null)

    const res = await call({ authorization: 'Bearer expired-token' }, { reason: 'x' })

    expect(res.status).toBe(401)
    expect(mockReportOrderProblem).not.toHaveBeenCalled()
  })

  it('400s on an empty reason', async () => {
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockReportOrderProblem.mockResolvedValue({ error: 'Please describe the problem.' })

    const res = await call({ authorization: 'Bearer valid-token' }, { reason: '   ' })

    expect(res.status).toBe(400)
  })

  it('404s when the order does not exist or belongs to another customer', async () => {
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockReportOrderProblem.mockResolvedValue({ error: 'Order not found.' })

    const res = await call({ authorization: 'Bearer valid-token' }, { reason: 'problem' }, 'someone-elses')

    expect(res.status).toBe(404)
  })

  it('tenant isolation: a token scoped to tenant A can never flag tenant B\'s order', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    // requireApiUser is passed tenant B's id and correctly finds no matching customer there.
    mockRequireApiUser.mockResolvedValue(null)

    const res = await call(
      { authorization: 'Bearer tenant-a-token', 'x-tenant-id': 'tenant-b' },
      { reason: 'problem' }
    )

    expect(res.status).toBe(401)
    expect(mockRequireApiUser).toHaveBeenCalledWith(expect.any(Request), 'tenant-b')
    expect(mockReportOrderProblem).not.toHaveBeenCalled()
  })

  it('tenant isolation: reportOrderProblem is always called with the resolved tenant, never a client-supplied one', async () => {
    mockRequireApiUser.mockResolvedValue({ id: 'cust-1' })
    mockReportOrderProblem.mockResolvedValue({})

    await call({ authorization: 'Bearer valid-token' }, { reason: 'problem' })

    expect(mockReportOrderProblem).toHaveBeenCalledWith('tenant-a', 'cust-1', 'o1', 'problem')
  })
})
