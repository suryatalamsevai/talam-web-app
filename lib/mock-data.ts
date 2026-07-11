// ponytail: single mock source-of-truth matching Prisma schema shapes.
// Replace with real API calls once data layer is wired.

const TENANT_ID = 'mock-tenant-001'
const now = new Date()
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400_000)

// ── Categories ──

export type MockCategory = {
  id: string
  tenantId: string
  name: string
  slug: string
  sortOrder: number
  createdAt: Date
}

export const categories: MockCategory[] = [
  { id: 'cat-sarees', tenantId: TENANT_ID, name: 'Sarees', slug: 'sarees', sortOrder: 0, createdAt: daysAgo(90) },
  { id: 'cat-kurtis', tenantId: TENANT_ID, name: 'Kurtis', slug: 'kurtis', sortOrder: 1, createdAt: daysAgo(90) },
  { id: 'cat-dupattas', tenantId: TENANT_ID, name: 'Dupattas', slug: 'dupattas', sortOrder: 2, createdAt: daysAgo(90) },
  { id: 'cat-sets', tenantId: TENANT_ID, name: 'Sets & Suits', slug: 'sets-suits', sortOrder: 3, createdAt: daysAgo(90) },
  { id: 'cat-lehengas', tenantId: TENANT_ID, name: 'Lehengas', slug: 'lehengas', sortOrder: 4, createdAt: daysAgo(90) },
  { id: 'cat-accessories', tenantId: TENANT_ID, name: 'Accessories', slug: 'accessories', sortOrder: 5, createdAt: daysAgo(90) },
]

// ── Customers (for reviews) ──

export type MockCustomer = { id: string; name: string }

export const customers: MockCustomer[] = [
  { id: 'cust-001', name: 'Priya Sharma' },
  { id: 'cust-002', name: 'Lakshmi Menon' },
  { id: 'cust-003', name: 'Ananya Reddy' },
  { id: 'cust-004', name: 'Divya Krishnan' },
  { id: 'cust-005', name: 'Meera Patel' },
  { id: 'cust-006', name: 'Kavitha Nair' },
  { id: 'cust-007', name: 'Sunitha Rajan' },
  { id: 'cust-008', name: 'Deepa Iyer' },
]

// ── Products ──

export type MockProduct = {
  id: string
  tenantId: string
  name: string
  slug: string
  description: string | null
  price: number
  comparePrice: number | null
  categoryId: string | null
  sizes: string[]
  images: string[]
  stockBySize: Record<string, number>
  isActive: boolean
  createdAt: Date
}

export const products: MockProduct[] = [
  {
    id: 'prod-001', tenantId: TENANT_ID, name: 'Kanjivaram Silk Saree', slug: 'kanjivaram-silk-saree',
    description: 'Handwoven Kanjivaram silk saree with rich zari work and a contrasting pallu. Made from pure mulberry silk with traditional temple border motifs. The saree comes with a matching blouse piece.\n\nCare: Dry clean only. Store in muslin cloth.',
    price: 2499, comparePrice: 3299, categoryId: 'cat-sarees',
    sizes: ['XS', 'S', 'M', 'L', 'XL'], images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    ],
    stockBySize: { XS: 2, S: 5, M: 8, L: 4, XL: 1 }, isActive: true, createdAt: daysAgo(30),
  },
  {
    id: 'prod-002', tenantId: TENANT_ID, name: 'Block Print Kurti Set', slug: 'block-print-kurti-set',
    description: 'Hand block printed cotton kurti set featuring Jaipur ajrakh prints. The set includes a straight-cut kurti with side slits, matching palazzo pants, and a printed dupatta.\n\nFabric: 100% cotton\nWash: Machine wash cold, gentle cycle',
    price: 1299, comparePrice: 1899, categoryId: 'cat-kurtis',
    sizes: ['S', 'M', 'L', 'XL'], images: [
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    ],
    stockBySize: { S: 12, M: 15, L: 10, XL: 6 }, isActive: true, createdAt: daysAgo(5),
  },
  {
    id: 'prod-003', tenantId: TENANT_ID, name: 'Zari Border Dupatta', slug: 'zari-border-dupatta',
    description: 'Lightweight Chanderi silk dupatta with hand-embroidered zari border. The sheer fabric drapes beautifully and adds elegance to any outfit.\n\nDimensions: 2.5m × 1m\nFabric: Chanderi silk blend',
    price: 699, comparePrice: 999, categoryId: 'cat-dupattas',
    sizes: ['Free Size'], images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    ],
    stockBySize: { 'Free Size': 20 }, isActive: true, createdAt: daysAgo(12),
  },
  {
    id: 'prod-004', tenantId: TENANT_ID, name: 'Anarkali Suit Set', slug: 'anarkali-suit-set',
    description: 'Flowing georgette anarkali with intricate thread embroidery on the yoke and sleeves. Comes with a matching churidar and net dupatta with scalloped edges.\n\nFabric: Pure georgette\nLining: Crepe\nCare: Dry clean recommended',
    price: 2099, comparePrice: 2499, categoryId: 'cat-sets',
    sizes: ['S', 'M', 'L'], images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
    ],
    stockBySize: { S: 4, M: 7, L: 3 }, isActive: true, createdAt: daysAgo(20),
  },
  {
    id: 'prod-005', tenantId: TENANT_ID, name: 'Pochampally Ikat Saree', slug: 'pochampally-ikat-saree',
    description: 'Authentic Pochampally Ikat saree handwoven by master artisans of Telangana. Features the signature diamond motifs created using the resist-dyeing technique.\n\nFabric: Handloom cotton-silk\nWeight: 550g\nCare: Dry clean only',
    price: 1899, comparePrice: null, categoryId: 'cat-sarees',
    sizes: ['M', 'L', 'XL'], images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
    ],
    stockBySize: { M: 3, L: 5, XL: 2 }, isActive: true, createdAt: daysAgo(2),
  },
  {
    id: 'prod-006', tenantId: TENANT_ID, name: 'Printed Salwar Kameez', slug: 'printed-salwar-kameez',
    description: 'Breezy cotton lawn salwar kameez with digital print in floral motifs. Relaxed A-line silhouette perfect for everyday wear.\n\nFabric: Cotton lawn\nWash: Machine washable',
    price: 1099, comparePrice: null, categoryId: 'cat-sets',
    sizes: ['S', 'M', 'L', 'XL'], images: [
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
    ],
    stockBySize: { S: 10, M: 15, L: 12, XL: 8 }, isActive: true, createdAt: daysAgo(8),
  },
  {
    id: 'prod-007', tenantId: TENANT_ID, name: 'Banarasi Silk Dupatta', slug: 'banarasi-silk-dupatta',
    description: 'Luxurious Banarasi silk dupatta with handwoven gold zari jaal work. Each piece takes 3–4 days to weave on a traditional handloom.\n\nDimensions: 2.5m × 1m\nFabric: Pure Banarasi silk',
    price: 899, comparePrice: 1299, categoryId: 'cat-dupattas',
    sizes: ['Free Size'], images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
    ],
    stockBySize: { 'Free Size': 15 }, isActive: true, createdAt: daysAgo(18),
  },
  {
    id: 'prod-008', tenantId: TENANT_ID, name: 'Teal Chanderi Set', slug: 'teal-chanderi-set',
    description: 'Teal Chanderi cotton kurta with hand-embroidered gotta patti work. Paired with flared palazzo in matching fabric. Festive yet lightweight.\n\nFabric: Chanderi cotton\nCare: Gentle hand wash',
    price: 2199, comparePrice: 2899, categoryId: 'cat-sets',
    sizes: ['XS', 'S', 'M'], images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    ],
    stockBySize: { XS: 2, S: 4, M: 6 }, isActive: true, createdAt: daysAgo(4),
  },
  {
    id: 'prod-009', tenantId: TENANT_ID, name: 'Embroidered Kurti', slug: 'embroidered-kurti',
    description: 'Chikankari embroidered cotton voile kurti with delicate shadow work. Comfortable and breathable, perfect for warm weather.\n\nFabric: Cotton voile\nEmbroidery: Hand chikankari\nWash: Hand wash cold',
    price: 999, comparePrice: null, categoryId: 'cat-kurtis',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'], images: [
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
    ],
    stockBySize: { S: 8, M: 12, L: 10, XL: 6, XXL: 3 }, isActive: true, createdAt: daysAgo(15),
  },
  {
    id: 'prod-010', tenantId: TENANT_ID, name: 'Silk Chiffon Dupatta', slug: 'silk-chiffon-dupatta',
    description: 'Elegant silk chiffon dupatta with hand-painted floral borders. Lightweight and versatile, pairs well with both ethnic and fusion outfits.\n\nDimensions: 2.5m × 1m\nFabric: Silk chiffon',
    price: 599, comparePrice: 799, categoryId: 'cat-dupattas',
    sizes: ['Free Size'], images: [
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    ],
    stockBySize: { 'Free Size': 25 }, isActive: true, createdAt: daysAgo(22),
  },
  {
    id: 'prod-011', tenantId: TENANT_ID, name: 'Patola Silk Saree', slug: 'patola-silk-saree',
    description: 'Double ikat Patola silk saree from Patan, Gujarat. This rare textile is woven by tying and dyeing both warp and weft threads before weaving. Each saree is unique.\n\nFabric: Pure silk (double ikat)\nWeight: 650g\nCare: Dry clean only',
    price: 3499, comparePrice: 4299, categoryId: 'cat-sarees',
    sizes: ['M', 'L'], images: [
      'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600',
      'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600',
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
    ],
    stockBySize: { M: 1, L: 2 }, isActive: true, createdAt: daysAgo(35),
  },
  {
    id: 'prod-012', tenantId: TENANT_ID, name: 'Palazzo Kurti Set', slug: 'palazzo-kurti-set',
    description: 'Rayon blend palazzo kurti set with contemporary geometric print. Easy, flowy silhouette with an elasticated palazzo waistband.\n\nFabric: Rayon blend\nWash: Machine wash cold',
    price: 1599, comparePrice: null, categoryId: 'cat-sets',
    sizes: ['S', 'M', 'L', 'XL'], images: [
      'https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=600',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600',
    ],
    stockBySize: { S: 6, M: 9, L: 7, XL: 4 }, isActive: true, createdAt: daysAgo(3),
  },
]

// ── Reviews ──

export type MockReview = {
  id: string
  tenantId: string
  productId: string
  customerId: string
  rating: number
  comment: string | null
  isVerifiedPurchase: boolean
  isDeleted: boolean
  createdAt: Date
}

export const reviews: MockReview[] = [
  // Kanjivaram Silk Saree
  { id: 'rev-001', tenantId: TENANT_ID, productId: 'prod-001', customerId: 'cust-001', rating: 5, comment: 'Absolutely stunning saree! The zari work is exquisite and the silk quality is top-notch. Wore it to my cousin\'s wedding and received so many compliments.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(10) },
  { id: 'rev-002', tenantId: TENANT_ID, productId: 'prod-001', customerId: 'cust-002', rating: 5, comment: 'Beautiful drape and the colors are exactly as shown. The blouse piece fabric is generous. Will definitely order again.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(15) },
  { id: 'rev-003', tenantId: TENANT_ID, productId: 'prod-001', customerId: 'cust-003', rating: 4, comment: 'Lovely saree overall. The pallu design is gorgeous. Only giving 4 stars because delivery took a bit longer than expected.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(20) },
  { id: 'rev-004', tenantId: TENANT_ID, productId: 'prod-001', customerId: 'cust-004', rating: 5, comment: 'This is my third purchase from this store and the quality is consistently excellent. The temple border is intricate and well-finished.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(25) },

  // Block Print Kurti Set
  { id: 'rev-005', tenantId: TENANT_ID, productId: 'prod-002', customerId: 'cust-005', rating: 4, comment: 'Love the block print pattern! Very comfortable for daily wear. The cotton is soft and breathable.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(3) },
  { id: 'rev-006', tenantId: TENANT_ID, productId: 'prod-002', customerId: 'cust-006', rating: 4, comment: 'Good quality kurti set. The palazzo fits well and the dupatta is a nice bonus. Colors haven\'t faded after multiple washes.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(7) },
  { id: 'rev-007', tenantId: TENANT_ID, productId: 'prod-002', customerId: 'cust-001', rating: 5, comment: 'Perfect everyday outfit. Ordered M and it fits true to size. The block print has that lovely handmade character.', isVerifiedPurchase: false, isDeleted: false, createdAt: daysAgo(12) },

  // Zari Border Dupatta
  { id: 'rev-008', tenantId: TENANT_ID, productId: 'prod-003', customerId: 'cust-007', rating: 5, comment: 'The Chanderi silk is so soft and the zari border catches light beautifully. Paired it with a plain kurta and it elevated the whole look.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(8) },
  { id: 'rev-009', tenantId: TENANT_ID, productId: 'prod-003', customerId: 'cust-002', rating: 5, comment: 'Received it as a gift and I absolutely love it! The craftsmanship is remarkable for this price point.', isVerifiedPurchase: false, isDeleted: false, createdAt: daysAgo(14) },

  // Anarkali Suit Set
  { id: 'rev-010', tenantId: TENANT_ID, productId: 'prod-004', customerId: 'cust-003', rating: 4, comment: 'Gorgeous anarkali with beautiful embroidery. The georgette fabric flows nicely. Wish it came in more colors.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(6) },
  { id: 'rev-011', tenantId: TENANT_ID, productId: 'prod-004', customerId: 'cust-008', rating: 5, comment: 'Wore this to a sangeet and it was perfect! Comfortable enough to dance in all night. The net dupatta is delicate but durable.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(11) },

  // Pochampally Ikat Saree
  { id: 'rev-012', tenantId: TENANT_ID, productId: 'prod-005', customerId: 'cust-004', rating: 5, comment: 'Authentic Pochampally weave — you can feel the quality. The ikat patterns are crisp and symmetrical. A true artisan piece.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(1) },
  { id: 'rev-013', tenantId: TENANT_ID, productId: 'prod-005', customerId: 'cust-005', rating: 5, comment: 'My favorite saree in my collection now. Light enough for daily wear but elegant enough for pujas.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(4) },

  // Patola Silk Saree
  { id: 'rev-014', tenantId: TENANT_ID, productId: 'prod-011', customerId: 'cust-006', rating: 5, comment: 'An investment piece worth every rupee. The double ikat technique is visible in the precision of the patterns. Heirloom quality.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(9) },
  { id: 'rev-015', tenantId: TENANT_ID, productId: 'prod-011', customerId: 'cust-007', rating: 5, comment: 'Bought this for my daughter\'s wedding trousseau. The colors are vibrant and the silk has a beautiful sheen.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(16) },
  { id: 'rev-016', tenantId: TENANT_ID, productId: 'prod-011', customerId: 'cust-008', rating: 4, comment: 'Stunning saree. The packaging was excellent too — came in a beautiful box. Only wishing it had more size options.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(21) },

  // Embroidered Kurti
  { id: 'rev-017', tenantId: TENANT_ID, productId: 'prod-009', customerId: 'cust-001', rating: 5, comment: 'The chikankari work is so fine and delicate. Very comfortable in summer. Ordered two more in different sizes for gifting.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(5) },
  { id: 'rev-018', tenantId: TENANT_ID, productId: 'prod-009', customerId: 'cust-003', rating: 4, comment: 'Beautiful kurti with traditional embroidery. Runs slightly loose — consider sizing down. The cotton quality is excellent.', isVerifiedPurchase: true, isDeleted: false, createdAt: daysAgo(13) },
]

// ── Tenant / Store ──

export type MockTenantStorefront = {
  id: string
  name: string
  tagline: string | null
  brandColor: string | null
  logoUrl: string | null
  whatsappNumber: string | null
  showWhatsappButton: boolean
  contactPhone: string | null
  contactEmail: string | null
  tier: string
  freeDeliveryAbove: number | null
  shippingFee: number
  deliveryEstimateText: string | null
  returnWindowDays: number | null
  trustBadgeText: string | null
  sizeGuideUrl: string | null
  about: {
    storyTitle: string | null
    description: string | null
    instagramUrl: string | null
    facebookUrl: string | null
    youtubeUrl: string | null
  } | null
  branch: { address: string | null; city: string | null; hours: string | null } | null
}

export const tenant: MockTenantStorefront = {
  id: TENANT_ID,
  name: 'Silk Test Store',
  tagline: 'Handcrafted Indian Ethnic Wear',
  brandColor: '#E8577E',
  logoUrl: null,
  whatsappNumber: '+919876543210',
  showWhatsappButton: true,
  contactPhone: '+91 98765 43210',
  contactEmail: 'hello@meenasilks.com',
  tier: 'pro',
  freeDeliveryAbove: 999,
  shippingFee: 99,
  deliveryEstimateText: '3–5 business days delivery',
  returnWindowDays: 7,
  trustBadgeText: 'Trusted by 10,000+ customers',
  sizeGuideUrl: '/size-guide',
  about: {
    storyTitle: 'Our Story',
    description: 'Founded in 2018, we bring you the finest handloom and handcrafted ethnic wear from artisans across India. Every piece tells a story of tradition, skill, and love.',
    instagramUrl: 'https://instagram.com',
    facebookUrl: 'https://facebook.com',
    youtubeUrl: null,
  },
  branch: { address: 'Anna Nagar, Chennai', city: 'Chennai — 600040', hours: '10am – 8pm' },
}

export type MockBranch = {
  id: string
  name: string
  address: string | null
  city: string | null
  phone: string | null
  mapsUrl: string | null
}

export const branches: MockBranch[] = [
  { id: 'branch-001', name: 'Anna Nagar Showroom', address: '12, 2nd Avenue, Anna Nagar', city: 'Chennai — 600040', phone: '+91 98765 43210', mapsUrl: 'https://maps.google.com' },
  { id: 'branch-002', name: 'T. Nagar Store', address: '45, Usman Road, T. Nagar', city: 'Chennai — 600017', phone: '+91 98765 43211', mapsUrl: 'https://maps.google.com' },
]

// ── Helpers (mirror lib/data/ function signatures) ──

const NEW_PRODUCT_WINDOW_MS = 14 * 86400_000

function enrichProduct(p: MockProduct) {
  const cat = categories.find(c => c.id === p.categoryId) ?? null
  const productReviews = reviews.filter(r => r.productId === p.id && !r.isDeleted)
  return {
    ...p,
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
    reviewCount: productReviews.length,
    averageRating: productReviews.length
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
      : null,
    isNew: Date.now() - p.createdAt.getTime() < NEW_PRODUCT_WINDOW_MS,
  }
}

export function mockGetProducts(filters?: {
  categoryId?: string
  size?: string
  minPrice?: number
  maxPrice?: number
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular'
}) {
  let result = products.filter(p => p.isActive)
  if (filters?.categoryId) result = result.filter(p => p.categoryId === filters.categoryId)
  if (filters?.size) result = result.filter(p => p.sizes.includes(filters.size!))
  if (filters?.minPrice) result = result.filter(p => p.price >= filters.minPrice!)
  if (filters?.maxPrice) result = result.filter(p => p.price <= filters.maxPrice!)

  const enriched = result.map(enrichProduct)

  if (filters?.sort === 'price-asc') enriched.sort((a, b) => a.price - b.price)
  else if (filters?.sort === 'price-desc') enriched.sort((a, b) => b.price - a.price)
  else if (filters?.sort === 'popular') enriched.sort((a, b) => b.reviewCount - a.reviewCount)
  else enriched.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  return enriched
}

export function mockGetProductBySlug(slug: string) {
  const p = products.find(pr => pr.slug === slug && pr.isActive)
  return p ? enrichProduct(p) : null
}

export function mockGetProductReviews(productId: string) {
  return reviews
    .filter(r => r.productId === productId && !r.isDeleted)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      isVerifiedPurchase: r.isVerifiedPurchase,
      createdAt: r.createdAt,
      customer: { name: customers.find(c => c.id === r.customerId)?.name ?? null },
    }))
}

export function mockGetCategories() {
  return categories
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(c => ({ id: c.id, name: c.name, slug: c.slug }))
}

export function mockGetTenantStorefront() {
  return tenant
}

export function mockGetBranches() {
  return branches
}

// ── Wishlist ──

export function mockGetWishlistItems() {
  return products.map(enrichProduct).map(p => ({
    ...p,
    addedAt: daysAgo(Math.floor(Math.random() * 30)),
    totalStock: Object.values(p.stockBySize).reduce((a, b) => a + b, 0),
  }))
}

// ── Orders ──

export type MockOrderStatus = 'Out for Delivery' | 'Shipped' | 'Delivered' | 'Cancelled' | 'Return Pickup'

export type MockOrder = {
  id: string
  orderId: string
  date: Date
  status: MockOrderStatus
  items: { product: ReturnType<typeof enrichProduct>; size: string; quantity: number; price: number }[]
  total: number
  trackingId?: string
  carrier?: string
  expectedDate?: string
  refundAmount?: number
  returnWindow?: string
}

export const mockOrders: MockOrder[] = [
  {
    id: 'order-001', orderId: 'ORD-2649', date: new Date('2026-06-28'),
    status: 'Out for Delivery',
    items: [
      { product: enrichProduct(products[0]), size: 'M', quantity: 1, price: 2499 },
      { product: enrichProduct(products[2]), size: 'Free Size', quantity: 1, price: 699 },
    ],
    total: 2998, expectedDate: 'Arrives today by 7 PM',
  },
  {
    id: 'order-002', orderId: 'ORD-2641', date: new Date('2026-06-24'),
    status: 'Shipped',
    items: [{ product: enrichProduct(products[4]), size: 'L', quantity: 1, price: 1899 }],
    total: 1899, trackingId: '9876543210', carrier: 'DTDC', expectedDate: 'Expected 2 Jul',
  },
  {
    id: 'order-003', orderId: 'ORD-2618', date: new Date('2026-06-10'),
    status: 'Delivered',
    items: [{ product: enrichProduct(products[2]), size: 'Free Size', quantity: 1, price: 699 }],
    total: 699, expectedDate: 'Delivered on 13 Jun 2026',
  },
  {
    id: 'order-004', orderId: 'ORD-2605', date: new Date('2026-06-02'),
    status: 'Cancelled',
    items: [{ product: enrichProduct(products[1]), size: 'M', quantity: 1, price: 1299 }],
    total: 1299, refundAmount: 1299,
  },
  {
    id: 'order-005', orderId: 'ORD-2590', date: new Date('2026-05-18'),
    status: 'Return Pickup',
    items: [{ product: enrichProduct(products[3]), size: 'L', quantity: 1, price: 2099 }],
    total: 2099, returnWindow: 'Pickup scheduled: 30 Jun · 10 AM – 2 PM',
  },
]

export function mockGetOrders(filter?: MockOrderStatus | 'All') {
  if (!filter || filter === 'All') return mockOrders
  return mockOrders.filter(o => o.status === filter)
}
