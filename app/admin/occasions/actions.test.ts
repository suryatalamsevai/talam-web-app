import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockFindFirst, mockCreate, mockCreateMany, mockUpdate, mockDelete, mockTransaction } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockCreateMany: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      productTag: { findFirst: mockFindFirst, create: mockCreate, update: mockUpdate, delete: mockDelete },
      productTagAssignment: { createMany: mockCreateMany, deleteMany: vi.fn() },
      $transaction: mockTransaction,
    })
  ),
}))

import { createOccasionAction, setOccasionStatusAction, deleteOccasion } from './actions'

describe('createOccasionAction', () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockCreateMany.mockReset()
  })

  it('rejects creating an occasion with no products, before touching the database', async () => {
    const result = await createOccasionAction({ name: 'Wedding', themeKey: 'wedding-gold', layout: 'grid', productIds: [] })

    expect(result.error).toBe('Select at least one product.')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates the occasion and assigns products when at least one is selected', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await createOccasionAction({ name: 'Wedding', themeKey: 'wedding-gold', layout: 'grid', productIds: ['p1', 'p2'] })

    expect(result.error).toBeUndefined()
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p1', sortOrder: 0 },
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p2', sortOrder: 1 },
      ],
    })
  })
})

describe('setOccasionStatusAction', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockUpdate.mockReset()
  })

  it('rejects turning on an occasion with no products', async () => {
    mockFindFirst.mockResolvedValueOnce({ _count: { products: 0 } })

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBe('Add a product before turning this on.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('turns an occasion off regardless of product count', async () => {
    mockFindFirst.mockResolvedValueOnce({ _count: { products: 0 } })

    const result = await setOccasionStatusAction('occasion-1', false)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'draft' } })
  })

  it('turns an occasion on when it has products', async () => {
    mockFindFirst.mockResolvedValueOnce({ _count: { products: 2 } })

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'published' } })
  })
})

describe('deleteOccasion', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockTransaction.mockReset()
  })

  it('rejects deleting a default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: true })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBe('Default occasions cannot be deleted.')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('deletes a non-default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: false })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
