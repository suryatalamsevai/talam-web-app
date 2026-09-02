import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AdminStaffRole } from '@prisma/client'

const {
  mockGetUser,
  mockIsAdminStaffEmail,
  mockGetAdminStaffRole,
  mockTouchAdminStaffLastActive,
  mockRedirect,
  mockWithTenant,
  mockCustomerFindUnique,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(async (): Promise<{
    data: { user: { id: string; email: string } | null }
    error: { message: string } | null
  }> => ({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })),
  mockIsAdminStaffEmail: vi.fn(async () => false),
  mockGetAdminStaffRole: vi.fn(async (): Promise<AdminStaffRole | null> => null),
  mockTouchAdminStaffLastActive: vi.fn(),
  mockRedirect: vi.fn(),
  mockWithTenant: vi.fn((tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ customer: { upsert: vi.fn() } })
  ),
  mockCustomerFindUnique: vi.fn(async (): Promise<{ tenantId: string } | null> => null),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (key: string) => {
      const map: Record<string, string> = {
        'x-tenant-id': 'tenant-1',
        'x-subdomain': 'silk',
        'x-tenant-tier': 'starter',
      }
      return map[key] ?? null
    },
  })),
}))

vi.mock('next/navigation', () => ({ redirect: mockRedirect }))

vi.mock('@/lib/prisma', () => ({
  withTenant: mockWithTenant,
  prisma: { customer: { findUnique: mockCustomerFindUnique } },
}))

// canAccessSection is a pure lookup — kept real via importActual so
// requireSuperAdminSection tests exercise the actual permission map.
vi.mock('@/lib/data/admin-staff', async () => {
  const actual = await vi.importActual<typeof import('@/lib/data/admin-staff')>('@/lib/data/admin-staff')
  return {
    ...actual,
    isAdminStaffEmail: mockIsAdminStaffEmail,
    getAdminStaffRole: mockGetAdminStaffRole,
    touchAdminStaffLastActive: mockTouchAdminStaffLastActive,
  }
})

import { requireTenant, requireAuth, requireApiUser, getSuperAdminRole, requireSuperAdminSection } from './auth-guard'

function bearerRequest(token?: string) {
  return new Request('https://api.example.com/api/v1/auth/me', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })
  delete process.env.SUPER_ADMIN_EMAILS
})

describe('requireTenant', () => {
  it('returns tenantId, subdomain, and tier from headers', async () => {
    const result = await requireTenant()
    expect(result.tenantId).toBe('tenant-1')
    expect(result.subdomain).toBe('silk')
    expect(result.tier).toBe('starter')
  })
})

describe('requireAuth', () => {
  it('returns the Supabase user when a session exists', async () => {
    const user = await requireAuth()
    expect(user.id).toBe('user-1')
  })
})

describe('requireApiUser', () => {
  it('returns the Supabase user for a valid bearer token, scoped to the given tenant', async () => {
    const user = await requireApiUser(bearerRequest('valid-token'), 'tenant-a')

    expect(user?.id).toBe('user-1')
    expect(mockGetUser).toHaveBeenCalledWith('valid-token')
    expect(mockWithTenant).toHaveBeenCalledWith('tenant-a', expect.any(Function))
  })

  it('returns null and never touches the database when the Authorization header is missing', async () => {
    const user = await requireApiUser(bearerRequest(), 'tenant-a')

    expect(user).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('returns null for a malformed Authorization header (not a Bearer token)', async () => {
    const request = new Request('https://api.example.com/api/v1/auth/me', {
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })

    const user = await requireApiUser(request, 'tenant-a')

    expect(user).toBeNull()
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('returns null for an invalid or expired token and never touches the database', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'token expired' } })

    const user = await requireApiUser(bearerRequest('expired-token'), 'tenant-a')

    expect(user).toBeNull()
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('returns null when the bearer-authenticated user is already a customer of a different tenant', async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({ tenantId: 'tenant-b' })

    const user = await requireApiUser(bearerRequest('valid-token'), 'tenant-a')

    expect(user).toBeNull()
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('returns the user without upserting when they already belong to the requested tenant', async () => {
    mockCustomerFindUnique.mockResolvedValueOnce({ tenantId: 'tenant-a' })

    const user = await requireApiUser(bearerRequest('valid-token'), 'tenant-a')

    expect(user?.id).toBe('user-1')
    expect(mockWithTenant).not.toHaveBeenCalled()
  })

  it('scopes each call to exactly the tenant the caller resolved for it — no cross-tenant bleed', async () => {
    await requireApiUser(bearerRequest('valid-token'), 'tenant-a')
    await requireApiUser(bearerRequest('valid-token'), 'tenant-b')

    expect(mockWithTenant).toHaveBeenCalledTimes(2)
    expect(mockWithTenant).toHaveBeenNthCalledWith(1, 'tenant-a', expect.any(Function))
    expect(mockWithTenant).toHaveBeenNthCalledWith(2, 'tenant-b', expect.any(Function))
    expect(mockWithTenant).not.toHaveBeenCalledWith('tenant-c', expect.anything())
  })
})

describe('getSuperAdminRole', () => {
  it('resolves an env-listed email to owner, bypassing the AdminStaff table', async () => {
    process.env.SUPER_ADMIN_EMAILS = 'test@example.com'

    const role = await getSuperAdminRole('test@example.com')

    expect(role).toBe('owner')
    expect(mockGetAdminStaffRole).not.toHaveBeenCalled()
  })

  it('falls back to the AdminStaff row role for a non-env email', async () => {
    mockGetAdminStaffRole.mockResolvedValue('billing_manager')

    const role = await getSuperAdminRole('staffer@example.com')

    expect(role).toBe('billing_manager')
  })
})

describe('requireSuperAdminSection', () => {
  it('allows a role into a section it has access to', async () => {
    process.env.SUPER_ADMIN_EMAILS = 'test@example.com'
    mockIsAdminStaffEmail.mockResolvedValue(false)

    const result = await requireSuperAdminSection('overview')

    expect(result.role).toBe('owner')
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('redirects when the role cannot access the section', async () => {
    // Not env-listed, so requireSuperAdmin()'s own gate relies on the AdminStaff row —
    // mockIsAdminStaffEmail(true) lets that pass so this test isolates the section check.
    mockIsAdminStaffEmail.mockResolvedValue(true)
    mockGetAdminStaffRole.mockResolvedValue('billing_manager')

    await requireSuperAdminSection('staff')

    expect(mockRedirect).toHaveBeenCalledWith('/not-found')
  })
})
