import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockRequireAuth,
  mockRequireTenant,
  mockDb,
  mockCreateNotification,
  mockSendOrderPlaced,
  mockSendNewOrder,
  mockGetDeliveryEstimate,
} = vi.hoisted(() => ({
  mockRequireAuth: vi.fn(async () => ({ id: 'cust-1' })),
  mockRequireTenant: vi.fn(async () => ({ tenantId: 't1', subdomain: 'silk', tier: 'trial' })),
  mockDb: {
    tenant: { findUnique: vi.fn() },
    product: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
    discountCode: { findUnique: vi.fn(), update: vi.fn() },
    address: { findFirst: vi.fn() },
    order: { create: vi.fn() },
    customer: { findUnique: vi.fn() },
  },
  mockCreateNotification: vi.fn(),
  mockSendOrderPlaced: vi.fn(),
  mockSendNewOrder: vi.fn(),
  mockGetDeliveryEstimate: vi.fn(),
}))

vi.mock('@/lib/auth-guard', () => ({ requireAuth: mockRequireAuth, requireTenant: mockRequireTenant }))
vi.mock('@/lib/prisma', () => ({
  prisma: mockDb,
  withTenant: (_tenantId: string, fn: (db: typeof mockDb) => unknown) => fn(mockDb),
}))
vi.mock('@/lib/data/notifications', () => ({ createNotification: mockCreateNotification }))
vi.mock('@/lib/resend', () => ({
  sendOrderPlacedEmail: mockSendOrderPlaced,
  sendNewOrderEmail: mockSendNewOrder,
}))
vi.mock('@/lib/shipping/shiprocket', () => ({ getDeliveryEstimate: mockGetDeliveryEstimate }))
vi.mock('next/headers', () => ({ headers: async () => new Map([['host', 'localhost:3000']]) }))
vi.mock('qrcode', () => ({ default: { toString: vi.fn(async () => '<svg />') } }))

import { getQuoteAction, placeOrderAction, validateCouponAction } from './actions'

const CART = [{ productId: 'p1', size: 'M', quantity: 2 }]

const ADDRESS = {
  name: 'Priya',
  phone: '9876543210',
  line1: '42 Bharathi Nagar',
  city: 'Madurai',
  state: 'Tamil Nadu',
  pincode: '625001',
}

function seedHappyPath({
  price = 1000,
  stock = 10,
  weight = 0.8,
}: { price?: number; stock?: number; weight?: number | null } = {}) {
  mockDb.tenant.findUnique.mockResolvedValue({
    name: 'Meena Silks',
    shippingFee: 99,
    freeDeliveryAbove: null,
    defaultShippingWeight: 0.5,
    slug: 'silk',
    contactEmail: 'owner@example.com',
    notifyEmailOnOrder: true,
  })
  mockDb.product.findMany.mockResolvedValue([
    { id: 'p1', name: 'Silk Saree', price, comparePrice: null, stockBySize: { M: stock }, weight },
  ])
  mockDb.product.findUniqueOrThrow.mockResolvedValue({ stockBySize: { M: stock } })
  mockDb.product.update.mockResolvedValue({})
  mockDb.order.create.mockResolvedValue({ id: 'order-1' })
  mockDb.customer.findUnique.mockResolvedValue({ name: 'Priya', email: 'priya@example.com' })
  // clearAllMocks resets calls but not implementations, so a rejection set by one test
  // would leak into the next without this.
  mockSendOrderPlaced.mockResolvedValue(undefined)
  mockSendNewOrder.mockResolvedValue(undefined)
  mockCreateNotification.mockResolvedValue(undefined)
  // Most stores have no Shiprocket account, so "unavailable, use the flat fee" is the
  // baseline every non-delivery test runs against; the delivery tests override it.
  mockGetDeliveryEstimate.mockResolvedValue({ error: 'Could not check delivery for this pincode right now.' })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe('getQuoteAction', () => {
  it('prices the cart from the database, ignoring anything the client thinks', async () => {
    seedHappyPath({ price: 1000 })
    const result = await getQuoteAction(CART)

    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.quote.itemsTotal).toBe(2000)
    expect(result.quote.total).toBe(2099)
    expect(result.lines[0].unitPrice).toBe(1000)
  })

  it('refuses a cart holding a product that is no longer purchasable', async () => {
    seedHappyPath()
    mockDb.product.findMany.mockResolvedValue([])
    expect(await getQuoteAction(CART)).toEqual({ error: 'One of the items in your cart is no longer available.' })
  })

  it('refuses a cart with more units than there is stock', async () => {
    seedHappyPath({ stock: 1 })
    expect(await getQuoteAction(CART)).toEqual({ error: 'Silk Saree (M) is out of stock.' })
  })

  it('rejects an empty cart', async () => {
    seedHappyPath()
    expect(await getQuoteAction([])).toEqual({ error: 'Your cart is empty.' })
  })

  it('does not quote a courier when no pincode has been entered yet', async () => {
    seedHappyPath({ price: 1000 })
    const result = await getQuoteAction(CART)

    expect(mockGetDeliveryEstimate).not.toHaveBeenCalled()
    if ('error' in result) throw new Error(result.error)
    expect(result.quote.shippingFee).toBe(99)
    expect(result.delivery).toEqual({ fullFee: 99, source: 'flat', etaDays: null, codAvailable: null })
  })

  it('charges the courier’s live rate instead of the flat fee once a pincode is known', async () => {
    seedHappyPath({ price: 1000 })
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 3, rate: 140, codAvailable: true })

    const result = await getQuoteAction(CART, undefined, '625001')

    if ('error' in result) throw new Error(result.error)
    expect(result.quote.shippingFee).toBe(140)
    expect(result.quote.total).toBe(2140)
    expect(result.delivery).toEqual({ fullFee: 140, source: 'live', etaDays: 3, codAvailable: true })
  })

  it('weighs the parcel from each product’s own weight times its quantity', async () => {
    seedHappyPath({ weight: 0.8 })
    await getQuoteAction(CART, undefined, '625001')

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '625001', weightKg: 1.6 })
  })

  it('falls back to the store’s default shipping weight for a product that has none', async () => {
    seedHappyPath({ weight: null })
    await getQuoteAction(CART, undefined, '625001')

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '625001', weightKg: 1 })
  })

  it('refuses a pincode no courier delivers to', async () => {
    seedHappyPath()
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: false })

    expect(await getQuoteAction(CART, undefined, '999999')).toEqual({
      error: "We can't currently deliver to this pincode.",
    })
  })

  it('keeps checkout working on the flat fee when the courier cannot be reached', async () => {
    seedHappyPath({ price: 1000 })
    mockGetDeliveryEstimate.mockResolvedValue({ error: 'Could not check delivery for this pincode right now.' })

    const result = await getQuoteAction(CART, undefined, '625001')

    if ('error' in result) throw new Error(result.error)
    expect(result.quote.shippingFee).toBe(99)
    expect(result.delivery).toEqual({ fullFee: 99, source: 'flat', etaDays: null, codAvailable: null })
  })

  it('reports what delivery would have cost when the order crosses the free-delivery threshold', async () => {
    seedHappyPath({ price: 1000 })
    mockDb.tenant.findUnique.mockResolvedValue({
      name: 'Meena Silks',
      shippingFee: 99,
      freeDeliveryAbove: 1500,
      defaultShippingWeight: 0.5,
      slug: 'silk',
      contactEmail: 'owner@example.com',
      notifyEmailOnOrder: true,
    })
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 3, rate: 140, codAvailable: true })

    const result = await getQuoteAction(CART, undefined, '625001')

    if ('error' in result) throw new Error(result.error)
    expect(result.quote.shippingFee).toBe(0)
    expect(result.delivery.fullFee).toBe(140)
    expect(result.delivery.source).toBe('live')
  })
})

describe('validateCouponAction', () => {
  it('applies a valid coupon to the server-computed total', async () => {
    seedHappyPath({ price: 1000 })
    mockDb.discountCode.findUnique.mockResolvedValue({
      id: 'd1',
      code: 'FEST10',
      type: 'percent',
      value: 10,
      minOrder: null,
      usesLimit: null,
      usesCount: 0,
      expiresAt: null,
      isActive: true,
    })

    const result = await validateCouponAction('fest10', CART)
    expect('error' in result).toBe(false)
    if ('error' in result) return
    expect(result.code).toBe('FEST10')
    expect(result.quote.couponDiscount).toBe(200)
    expect(result.quote.total).toBe(1899)
  })

  it('rejects an unknown code', async () => {
    seedHappyPath()
    mockDb.discountCode.findUnique.mockResolvedValue(null)
    expect(await validateCouponAction('NOPE', CART)).toEqual({ error: 'That coupon code is not valid.' })
  })

  it('rejects an expired code', async () => {
    seedHappyPath()
    mockDb.discountCode.findUnique.mockResolvedValue({
      id: 'd1',
      code: 'OLD',
      type: 'percent',
      value: 10,
      minOrder: null,
      usesLimit: null,
      usesCount: 0,
      expiresAt: new Date('2020-01-01'),
      isActive: true,
    })
    expect(await validateCouponAction('OLD', CART)).toEqual({ error: 'That coupon has expired.' })
  })
})

describe('placeOrderAction', () => {
  const input = {
    cart: CART,
    paymentProvider: 'upi_manual' as const,
    address: ADDRESS,
    utr: '123456789012',
  }

  it('creates the order with server-computed totals and decrements stock', async () => {
    seedHappyPath({ price: 1000, stock: 10 })

    const result = await placeOrderAction(input)
    expect(result).toEqual({ orderId: 'order-1' })

    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          itemsTotal: 2000,
          discount: 0,
          shippingFee: 99,
          total: 2099,
          paymentStatus: 'pending',
          paymentId: '123456789012',
        }),
      })
    )
    expect(mockDb.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { stockBySize: { M: 8 } } })
    )
  })

  it('creates a Pay on Delivery order with no UTR and no UTR validation', async () => {
    seedHappyPath({ price: 1000, stock: 10 })

    const result = await placeOrderAction({ ...input, paymentProvider: 'cod', utr: undefined })
    expect(result).toEqual({ orderId: 'order-1' })

    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentProvider: 'cod',
          paymentStatus: 'pending',
          paymentId: null,
        }),
      })
    )
  })

  it('rejects a UPI order without a 12-digit reference number or a payment screenshot', async () => {
    seedHappyPath()
    expect(await placeOrderAction({ ...input, utr: '12345' })).toEqual({
      error: 'Enter the 12-digit UPI reference number, or upload a payment screenshot.',
    })
    expect(mockDb.order.create).not.toHaveBeenCalled()
  })

  it('accepts a UPI order with a payment screenshot but no UTR', async () => {
    seedHappyPath()
    const result = await placeOrderAction({ ...input, utr: undefined, paymentProofUrl: 'https://cdn.example.com/proof.png' })
    expect(result).toEqual({ orderId: 'order-1' })
    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentProofUrl: 'https://cdn.example.com/proof.png' }) })
    )
  })

  it('refuses to create an order when stock ran out between pricing and writing', async () => {
    seedHappyPath({ stock: 10 })
    // Passes the advisory check, fails the in-transaction re-read.
    mockDb.product.findUniqueOrThrow.mockResolvedValue({ stockBySize: { M: 1 } })

    expect(await placeOrderAction(input)).toEqual({ error: 'Silk Saree (M) just went out of stock.' })
    expect(mockDb.order.create).not.toHaveBeenCalled()
  })

  it('rejects an order with no address', async () => {
    seedHappyPath()
    expect(await placeOrderAction({ ...input, address: undefined })).toEqual({
      error: 'A delivery address is required.',
    })
  })

  it('rejects a saved address that does not belong to the customer', async () => {
    seedHappyPath()
    mockDb.address.findFirst.mockResolvedValue(null)
    expect(await placeOrderAction({ ...input, address: undefined, addressId: 'someone-elses' })).toEqual({
      error: 'A delivery address is required.',
    })
  })

  it('increments the coupon usage count when one was applied', async () => {
    seedHappyPath()
    mockDb.discountCode.findUnique.mockResolvedValue({
      id: 'd1',
      code: 'FEST10',
      type: 'percent',
      value: 10,
      minOrder: null,
      usesLimit: null,
      usesCount: 0,
      expiresAt: null,
      isActive: true,
    })

    await placeOrderAction({ ...input, couponCode: 'FEST10' })
    expect(mockDb.discountCode.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: { usesCount: { increment: 1 } },
    })
  })

  it('stores the full price breakdown so the invoice can be rebuilt later', async () => {
    seedHappyPath({ price: 1000 })
    mockDb.discountCode.findUnique.mockResolvedValue({
      id: 'd1',
      code: 'FEST10',
      type: 'percent',
      value: 10,
      minOrder: null,
      usesLimit: null,
      usesCount: 0,
      expiresAt: null,
      isActive: true,
    })

    await placeOrderAction({ ...input, couponCode: 'FEST10' })

    const { data } = mockDb.order.create.mock.calls[0][0]
    expect(data).toMatchObject({ itemsTotal: 2000, discount: 200, shippingFee: 99, discountCode: 'FEST10', total: 1899 })
    // The stored parts must reconstruct the charged total exactly.
    expect(Number(data.itemsTotal) - Number(data.discount) + Number(data.shippingFee)).toBe(Number(data.total))
  })

  it('still returns the placed order when sending mail blows up', async () => {
    seedHappyPath()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSendOrderPlaced.mockRejectedValue(new Error('resend is down'))

    expect(await placeOrderAction(input)).toEqual({ orderId: 'order-1' })
  })

  it('emails both the customer and the store owner', async () => {
    seedHappyPath()
    await placeOrderAction(input)

    expect(mockSendOrderPlaced).toHaveBeenCalledWith(
      'priya@example.com',
      expect.objectContaining({
        trackUrl: 'http://localhost:3000/dev/store/silk/orders/order-1',
        invoiceUrl: 'http://localhost:3000/dev/store/silk/orders/order-1/invoice',
      })
    )
    expect(mockSendNewOrder).toHaveBeenCalledWith(
      'owner@example.com',
      expect.objectContaining({ adminOrdersUrl: 'http://localhost:3000/dev/store/silk/admin/orders' })
    )
    expect(mockCreateNotification).toHaveBeenCalledWith('t1', expect.objectContaining({ type: 'new_order' }))
  })

  it('does not email the owner when they have turned order emails off', async () => {
    seedHappyPath()
    mockDb.tenant.findUnique.mockResolvedValue({
      name: 'Meena Silks',
      shippingFee: 99,
      freeDeliveryAbove: null,
      slug: 'silk',
      contactEmail: 'owner@example.com',
      notifyEmailOnOrder: false,
    })

    await placeOrderAction(input)
    expect(mockSendNewOrder).not.toHaveBeenCalled()
    expect(mockSendOrderPlaced).toHaveBeenCalled()
  })

  it('skips the customer email when there is no address on file, without failing the order', async () => {
    seedHappyPath()
    mockDb.customer.findUnique.mockResolvedValue({ name: 'Priya', email: null })

    expect(await placeOrderAction(input)).toEqual({ orderId: 'order-1' })
    expect(mockSendOrderPlaced).not.toHaveBeenCalled()
  })

  it('prices the order against the delivery address, not the flat fee', async () => {
    seedHappyPath({ price: 1000 })
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 3, rate: 140, codAvailable: true })

    await placeOrderAction(input)

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '625001', weightKg: 1.6 })
    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ shippingFee: 140, total: 2140 }) })
    )
  })

  it('stores the courier ETA on the order so the confirmation can show a real date', async () => {
    seedHappyPath()
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 3, rate: 140, codAvailable: true })

    await placeOrderAction(input)

    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estimatedDeliveryDays: 3 }) })
    )
  })

  it('stores no ETA when the courier could not be reached at order time', async () => {
    seedHappyPath()

    await placeOrderAction(input)

    expect(mockDb.order.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ estimatedDeliveryDays: null }) })
    )
  })

  it('refuses to place an order for a pincode no courier delivers to', async () => {
    seedHappyPath()
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: false })

    expect(await placeOrderAction(input)).toEqual({ error: "We can't currently deliver to this pincode." })
    expect(mockDb.order.create).not.toHaveBeenCalled()
  })

  it('reads the pincode off a saved address when the customer picked one', async () => {
    seedHappyPath()
    mockDb.address.findFirst.mockResolvedValue({
      ...ADDRESS,
      id: 'addr-1',
      pincode: '600001',
      line2: null,
    })
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 2, rate: 120, codAvailable: true })

    await placeOrderAction({ ...input, address: undefined, addressId: 'addr-1' })

    expect(mockGetDeliveryEstimate).toHaveBeenCalledWith('t1', { pincode: '600001', weightKg: 1.6 })
  })

  it('tells the customer their estimated delivery date in the confirmation email', async () => {
    seedHappyPath()
    mockGetDeliveryEstimate.mockResolvedValue({ serviceable: true, etaDays: 3, rate: 140, codAvailable: true })

    await placeOrderAction(input)

    expect(mockSendOrderPlaced).toHaveBeenCalledWith(
      'priya@example.com',
      expect.objectContaining({ estimatedDeliveryText: expect.stringMatching(/^\w{3}, \d{1,2} \w+$/) })
    )
  })

  it('leaves the estimated delivery line out of the email when there is no ETA', async () => {
    seedHappyPath()

    await placeOrderAction(input)

    expect(mockSendOrderPlaced.mock.calls[0][1].estimatedDeliveryText).toBeUndefined()
  })
})
