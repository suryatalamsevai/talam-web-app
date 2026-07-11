export const STEPS = [
  {
    mobile: 'Store',
    title: 'Store & website',
    description: 'Name, category, and URL',
  },
  {
    mobile: 'Brand',
    title: 'Brand your store',
    description: 'Logo, colors, and look',
  },
  {
    mobile: 'Prod',
    title: 'Add first product',
    description: 'Name, photo, price, and stock',
  },
  {
    mobile: 'Pay',
    title: 'Connect payments',
    description: 'UPI, Razorpay, or Instamojo',
  },
  {
    mobile: 'Live',
    title: 'Go live',
    description: 'Launch your store to the world',
  },
] as const

export const STORE_TYPES = ['Ethnic wear', 'Bakery', 'Handicrafts', 'Salon', 'Other'] as const

export const BRAND_COLORS = ['#E8577E', '#4F3FF0', '#10B981', '#F59E0B', '#EF4444', '#1A1A1A'] as const

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const

export const PAYMENTS = [
  {
    id: 'upi',
    name: 'UPI Manual',
    description: 'Collect payments to your UPI ID and confirm orders yourself.',
    markClassName: 'bg-bg-dark text-amber',
    mark: 'UPI',
  },
  {
    id: 'instamojo',
    name: 'Instamojo',
    description: 'Best for individual sellers with PAN and savings account.',
    markClassName: 'bg-[#004282] text-surface',
    mark: 'IM',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Use your existing Razorpay account for cards and UPI.',
    markClassName: 'bg-[#072654] text-surface',
    mark: 'RZP',
  },
] as const

export type BrandColor = (typeof BRAND_COLORS)[number]
export type PaymentId = (typeof PAYMENTS)[number]['id']
