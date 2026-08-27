import { describe, it, expect, vi } from 'vitest'

const tenantsByColumn: Record<string, Record<string, { id: string; slug: string; tier: string }>> = {
  slug: { silk: { id: 'uuid-123', slug: 'silk', tier: 'starter' } },
  id: {
    'uuid-a': { id: 'uuid-a', slug: 'tenant-a', tier: 'starter' },
    'uuid-b': { id: 'uuid-b', slug: 'tenant-b', tier: 'growth' },
  },
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn((column: string, value: string) => ({
          single: vi.fn().mockResolvedValue(
            tenantsByColumn[column]?.[value]
              ? { data: tenantsByColumn[column][value], error: null }
              : { data: null, error: { message: 'not found' } }
          ),
        })),
      })),
    })),
  })),
}))

import { getTenantBySlug, getTenantById, resolveTenantForApi } from './tenant'

function request(headers: Record<string, string>) {
  return new Request('https://api.example.com/api/v1/anything', { headers })
}

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

describe('getTenantById', () => {
  it('returns tenant when id exists', async () => {
    const tenant = await getTenantById('uuid-a')
    expect(tenant).toEqual({ id: 'uuid-a', slug: 'tenant-a', tier: 'starter' })
  })

  it('returns null for an unknown id', async () => {
    const tenant = await getTenantById('does-not-exist')
    expect(tenant).toBeNull()
  })

  it('returns null for empty id', async () => {
    const tenant = await getTenantById('')
    expect(tenant).toBeNull()
  })
})

describe('resolveTenantForApi', () => {
  it('resolves via x-tenant-id when present', async () => {
    const tenant = await resolveTenantForApi(request({ 'x-tenant-id': 'uuid-b' }))
    expect(tenant).toEqual({ id: 'uuid-b', slug: 'tenant-b', tier: 'growth' })
  })

  it('falls back to x-tenant-slug when x-tenant-id is absent', async () => {
    const tenant = await resolveTenantForApi(request({ 'x-tenant-slug': 'silk' }))
    expect(tenant).toEqual({ id: 'uuid-123', slug: 'silk', tier: 'starter' })
  })

  it('prefers x-tenant-id over x-tenant-slug when both are sent', async () => {
    const tenant = await resolveTenantForApi(request({ 'x-tenant-id': 'uuid-a', 'x-tenant-slug': 'silk' }))
    expect(tenant?.id).toBe('uuid-a')
  })

  it('returns null when neither header is present', async () => {
    const tenant = await resolveTenantForApi(request({}))
    expect(tenant).toBeNull()
  })

  it('returns null when the referenced tenant does not exist', async () => {
    const tenant = await resolveTenantForApi(request({ 'x-tenant-id': 'ghost' }))
    expect(tenant).toBeNull()
  })

  it('tenant isolation: distinct ids resolve to their own tenant and never cross-mix', async () => {
    const tenantA = await resolveTenantForApi(request({ 'x-tenant-id': 'uuid-a' }))
    const tenantB = await resolveTenantForApi(request({ 'x-tenant-id': 'uuid-b' }))

    expect(tenantA?.slug).toBe('tenant-a')
    expect(tenantB?.slug).toBe('tenant-b')
    expect(tenantA?.id).not.toBe(tenantB?.id)
  })
})
