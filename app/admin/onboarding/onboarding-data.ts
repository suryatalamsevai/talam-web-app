export const STEPS = [
  { mobile: 'Store', title: 'Store & website', description: 'Name, category, and URL' },
  { mobile: 'Brand', title: 'Brand your store', description: 'Logo, colors, and look' },
  { mobile: 'Contact', title: 'Contact & address', description: 'Phone, email, and location' },
  { mobile: 'Story', title: 'Your story', description: 'Tagline and about your store' },
  { mobile: 'Prod', title: 'Add first product', description: 'Name, photo, price, and stock' },
  { mobile: 'Pay', title: 'Connect payments', description: 'UPI, Razorpay, or Instamojo' },
  { mobile: 'Live', title: 'Go live', description: 'Launch your store to the world' },
] as const

export const STEP_ACCENTS = [
  { wash: '#c1502e', solid: 'bg-brand-primary', text: 'text-brand-primary' },
  { wash: '#e8577e', solid: 'bg-store-primary', text: 'text-store-primary' },
  { wash: '#f59e0b', solid: 'bg-amber', text: 'text-amber' },
  { wash: '#8b5cf6', solid: 'bg-violet-500', text: 'text-violet-500' },
  { wash: '#0ea5e9', solid: 'bg-sky-500', text: 'text-sky-500' },
  { wash: '#14b8a6', solid: 'bg-teal-500', text: 'text-teal-500' },
  { wash: '#10b981', solid: 'bg-emerald-500', text: 'text-emerald-500' },
] as const

export const STORE_TYPES = ['Ethnic wear', 'Bakery', 'Handicrafts', 'Salon', 'Other'] as const

export const BRAND_COLORS = ['#4F3FF0', '#EC4899', '#06B6D4', '#8B5CF6'] as const

export const PAYMENTS = [
  {
    id: 'upi',
    name: 'UPI',
    description: 'Google Pay, PhonePe, BHIM, Paytm',
    markClassName: 'bg-bg-dark text-amber',
    mark: 'UPI',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    description: 'Credit/Debit Card, UPI, Wallets',
    markClassName: 'bg-[#072654] text-surface',
    mark: 'RZP',
  },
  {
    id: 'instamojo',
    name: 'Instamojo',
    description: 'Credit/Debit Card, UPI, EMI',
    markClassName: 'bg-[#004282] text-surface',
    mark: 'IM',
  },
] as const

export type BrandColor = (typeof BRAND_COLORS)[number]
export type PaymentId = (typeof PAYMENTS)[number]['id']
