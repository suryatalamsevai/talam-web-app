import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFindManyWishlist, mockFindManyProduct } = vi.hoisted(() => ({
  mockFindManyWishlist: vi.fn(),
  mockFindManyProduct: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      wishlist: { findMany: mockFindManyWishlist },
      product: { findMany: mockFindManyProduct },
    })
  ),
}))

import { getEmptyCartSuggestions } from './cart-suggestions'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getEmptyCartSuggestions', () => {
  it('returns wishlist items for a signed-in customer with saved products', async () => {
    mockFindManyWishlist.mockResolvedValue([
      { product: { name: 'Rose Bouquet', slug: 'rose-bouquet', price: 499, comparePrice: 599, images: ['img.jpg'] } },
    ])

    const result = await getEmptyCartSuggestions('tenant-1', 'customer-1')

    expect(result).toEqual({
      source: 'saved',
      items: [{ name: 'Rose Bouquet', slug: 'rose-bouquet', price: 499, comparePrice: 599, image: 'img.jpg' }],
    })
    expect(mockFindManyProduct).not.toHaveBeenCalled()
  })

  it('falls back to trending when the signed-in customer has an empty wishlist', async () => {
    mockFindManyWishlist.mockResolvedValue([])
    mockFindManyProduct.mockResolvedValue([
      { name: 'Lily Bunch', slug: 'lily-bunch', price: 299, comparePrice: null, images: [] },
    ])

    const result = await getEmptyCartSuggestions('tenant-1', 'customer-1')

    expect(result).toEqual({
      source: 'trending',
      items: [{ name: 'Lily Bunch', slug: 'lily-bunch', price: 299, comparePrice: null, image: null }],
    })
  })

  it('skips the wishlist lookup entirely for an anonymous shopper', async () => {
    mockFindManyProduct.mockResolvedValue([])

    const result = await getEmptyCartSuggestions('tenant-1', null)

    expect(result).toEqual({ source: 'trending', items: [] })
    expect(mockFindManyWishlist).not.toHaveBeenCalled()
  })

  it('tenant isolation: only queries within the given tenant', async () => {
    mockFindManyWishlist.mockResolvedValue([])
    mockFindManyProduct.mockResolvedValue([])

    await getEmptyCartSuggestions('tenant-a', 'customer-1')

    expect(mockFindManyProduct).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-a' }) })
    )
  })
})
