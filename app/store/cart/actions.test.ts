import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetRequestTenantId, mockGetUser, mockGetEmptyCartSuggestionsData } = vi.hoisted(() => ({
  mockGetRequestTenantId: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetEmptyCartSuggestionsData: vi.fn(),
}))

vi.mock('@/lib/data/tenant', () => ({ getRequestTenantId: mockGetRequestTenantId }))
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))
vi.mock('@/lib/data/cart-suggestions', () => ({
  getEmptyCartSuggestions: mockGetEmptyCartSuggestionsData,
}))

import { getEmptyCartSuggestions } from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEmptyCartSuggestions (Server Action)', () => {
  it('returns an empty trending result without querying when there is no tenant', async () => {
    mockGetRequestTenantId.mockResolvedValue(null)

    const result = await getEmptyCartSuggestions()

    expect(result).toEqual({ source: 'trending', items: [] })
    expect(mockGetEmptyCartSuggestionsData).not.toHaveBeenCalled()
  })

  it('delegates to the shared lib function with the resolved tenant and signed-in user', async () => {
    mockGetRequestTenantId.mockResolvedValue('tenant-1')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'customer-1' } } })
    mockGetEmptyCartSuggestionsData.mockResolvedValue({ source: 'saved', items: [] })

    const result = await getEmptyCartSuggestions()

    expect(mockGetEmptyCartSuggestionsData).toHaveBeenCalledWith('tenant-1', 'customer-1')
    expect(result).toEqual({ source: 'saved', items: [] })
  })

  it('passes a null customer id for an anonymous shopper', async () => {
    mockGetRequestTenantId.mockResolvedValue('tenant-1')
    mockGetUser.mockResolvedValue({ data: { user: null } })
    mockGetEmptyCartSuggestionsData.mockResolvedValue({ source: 'trending', items: [] })

    await getEmptyCartSuggestions()

    expect(mockGetEmptyCartSuggestionsData).toHaveBeenCalledWith('tenant-1', null)
  })
})
