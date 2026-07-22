import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerSession: vi.fn().mockResolvedValue({ userId: 'user-1' }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    tenant: { upsert: vi.fn(), update: vi.fn() },
    storeBranch: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    storeAbout: { upsert: vi.fn() },
    product: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    productCategory: {
      count: vi.fn().mockResolvedValue(0),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    storeBanner: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({}) },
    storePromotion: { count: vi.fn().mockResolvedValue(0), create: vi.fn().mockResolvedValue({}) },
    productTag: { upsert: vi.fn().mockResolvedValue({}) },
  },
}))

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['host', 'localhost:3000']])),
}))

import { prisma } from '@/lib/prisma'
import {
  completeOnboarding,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveProductStep,
  saveStoreStep,
  saveStoryStep,
} from './actions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('saveStoreStep', () => {
  it('upserts the tenant by ownerId', async () => {
    vi.mocked(prisma.tenant.upsert).mockResolvedValue({} as never)
    const result = await saveStoreStep({ storeName: 'Priya Boutique', slug: 'priya-boutique', category: 'Clothing' })
    expect(result).toEqual({})
    expect(prisma.tenant.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'user-1' } }))
  })

  it('returns a friendly error on slug collision', async () => {
    const { Prisma } = await import('@prisma/client')
    const error = Object.create(Prisma.PrismaClientKnownRequestError.prototype)
    error.code = 'P2002'
    error.meta = { target: ['slug'] }
    vi.mocked(prisma.tenant.upsert).mockRejectedValue(error)
    const result = await saveStoreStep({ storeName: 'Priya', slug: 'priya', category: 'Clothing' })
    expect(result).toEqual({ error: 'That store URL is taken — try another.' })
  })
})

describe('saveBrandStep', () => {
  it('updates brandColor', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await saveBrandStep({ brandColor: '#4F3FF0' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { ownerId: 'user-1' }, data: expect.objectContaining({ brandColor: '#4F3FF0' }) })
    )
  })
})

describe('saveContactStep', () => {
  it('creates a branch when none exists yet', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.storeBranch.create).mockResolvedValue({} as never)
    const result = await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchCity: 'Bengaluru',
    })
    expect(result).toEqual({})
    expect(prisma.storeBranch.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Main store' }) })
    )
  })

  it('updates the existing branch instead of creating a second one', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeBranch.findFirst).mockResolvedValue({ id: 'branch-1' } as never)
    vi.mocked(prisma.storeBranch.update).mockResolvedValue({} as never)
    await saveContactStep({
      contactPhone: '9999999999',
      contactEmail: 'owner@store.com',
      branchName: 'Main store',
      branchAddress: '123 MG Road',
      branchCity: 'Bengaluru',
    })
    expect(prisma.storeBranch.create).not.toHaveBeenCalled()
    expect(prisma.storeBranch.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'branch-1' } }))
  })
})

describe('saveStoryStep', () => {
  it('updates tagline and upserts the about description', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.storeAbout.upsert).mockResolvedValue({} as never)
    const result = await saveStoryStep({ tagline: 'Handmade with love', aboutDescription: 'We started in 2020...' })
    expect(result).toEqual({})
    expect(prisma.storeAbout.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }))
  })
})

describe('saveProductStep', () => {
  it('creates the first product when none exists', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ id: 'tenant-1' } as never)
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null)
    vi.mocked(prisma.product.create).mockResolvedValue({} as never)
    const result = await saveProductStep({ productName: 'Cotton Saree', productPrice: '1499', productStock: '10' })
    expect(result).toEqual({})
    expect(prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Cotton Saree', sizes: ['Free Size'] }) })
    )
  })
})

describe('savePaymentStep', () => {
  it('maps the payment id to a provider', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({} as never)
    const result = await savePaymentStep({ paymentId: 'razorpay' })
    expect(result).toEqual({})
    expect(prisma.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentProvider: 'razorpay' }) })
    )
  })
})

describe('completeOnboarding', () => {
  it('marks the tenant onboarded and returns the dev admin dashboard URL', async () => {
    vi.mocked(prisma.tenant.update).mockResolvedValue({ slug: 'priya-boutique' } as never)
    const result = await completeOnboarding()
    expect(result).toEqual({ adminUrl: '/dev/store/priya-boutique/admin/dashboard' })
  })
})
