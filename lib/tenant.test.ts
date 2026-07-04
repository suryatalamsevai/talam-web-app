import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'uuid-123', slug: 'silk', tier: 'starter' },
            error: null,
          }),
        })),
      })),
    })),
  })),
}))

import { getTenantBySlug } from './tenant'

describe('getTenantBySlug', () => {
  it('returns tenant when slug exists', async () => {
    const tenant = await getTenantBySlug('silk')
    expect(tenant).toEqual({ id: 'uuid-123', slug: 'silk', tier: 'starter' })
  })

  it('returns null for empty slug', async () => {
    const tenant = await getTenantBySlug('')
    expect(tenant).toBeNull()
  })
})
