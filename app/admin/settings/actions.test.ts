import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerTenant: vi.fn().mockResolvedValue({ userId: 'user-1', tenantId: 'tenant-1' }),
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

vi.mock('@/lib/razorpay', () => ({
  createLinkedAccount: vi.fn(),
  getLinkedAccount: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ tenant: { findUnique: vi.fn(), update: vi.fn() } })
  ),
}))

import { withTenant } from '@/lib/prisma'
import { createLinkedAccount, getLinkedAccount } from '@/lib/razorpay'
import { startRazorpayOnboardingAction, refreshRazorpayStatusAction } from './actions'

beforeEach(() => vi.clearAllMocks())

describe('startRazorpayOnboardingAction', () => {
  it('creates a linked account, stores pending status, and returns the onboarding URL', async () => {
    const db = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ name: 'Priya Boutique', contactEmail: 'a@b.com', contactPhone: '9999999999' }),
        update: vi.fn(),
      },
    }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
    vi.mocked(createLinkedAccount).mockResolvedValue({ id: 'acc_1', status: 'created' })

    const result = await startRazorpayOnboardingAction()

    expect(result).toEqual({ onboardingUrl: 'https://dashboard.razorpay.com/onboarding/acc_1' })
    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({
          paymentProvider: 'razorpay',
          paymentConfig: expect.objectContaining({ provider: 'razorpay', accountId: 'acc_1', status: 'pending' }),
        }),
      })
    )
  })

  it('returns an error when the tenant has no contact email/phone yet', async () => {
    const db = { tenant: { findUnique: vi.fn().mockResolvedValue({ name: 'Priya', contactEmail: null, contactPhone: null }), update: vi.fn() } }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))

    const result = await startRazorpayOnboardingAction()
    expect(result).toEqual({ error: 'Add a contact phone and email before connecting Razorpay.' })
    expect(createLinkedAccount).not.toHaveBeenCalled()
  })
})

describe('refreshRazorpayStatusAction', () => {
  it('fetches the linked account from Razorpay and persists the latest status', async () => {
    const db = {
      tenant: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'pending', updatedAt: '2026-07-21T00:00:00.000Z' } }),
        update: vi.fn(),
      },
    }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
    vi.mocked(getLinkedAccount).mockResolvedValue({ id: 'acc_1', status: 'activated' })

    const result = await refreshRazorpayStatusAction()

    expect(result).toEqual({ status: 'activated' })
    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'activated' }) }) })
    )
  })

  it('returns an error when the tenant has no Razorpay account yet', async () => {
    const db = { tenant: { findUnique: vi.fn().mockResolvedValue({ paymentConfig: null }), update: vi.fn() } }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))

    const result = await refreshRazorpayStatusAction()
    expect(result).toEqual({ error: 'No Razorpay account connected yet.' })
    expect(getLinkedAccount).not.toHaveBeenCalled()
  })
})
