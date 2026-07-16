'use client'

import { useState } from 'react'
import { ChevronLeft, AlertTriangle, X, GripVertical } from 'lucide-react'
import Link from 'next/link'

const TABS = ['About', 'Store', 'Alerts', 'Promotions', 'Subscription', 'Payments', 'Contact Info'] as const
type Tab = (typeof TABS)[number] | 'Delete Store'

const COLOR_PRESETS = ['#C1502E', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9']

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-[26px] w-12 shrink-0 cursor-pointer items-center rounded-full px-[2px] transition-colors ${checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'}`}
    >
      <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  )
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between border-b border-border-light pb-2">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">{children}</p>
      {right}
    </div>
  )
}

function Input({ label, defaultValue, type = 'text', ...props }: { label: string; defaultValue?: string; type?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-fg">{label}</span>
      <input
        type={type}
        defaultValue={defaultValue}
        className="rounded-lg border border-border bg-surface px-3 py-[11px] text-md text-fg outline-none transition-colors focus:border-brand-primary"
        {...props}
      />
    </label>
  )
}

// ── About Tab ──
function AboutTab() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Store Story</SectionLabel>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-fg">Your Story</span>
          <textarea
            rows={4}
            defaultValue="Meena Silks is a family-owned business founded in 1995, specializing in handcrafted sarees and traditional wear. Each piece is curated with care..."
            className="rounded-lg border border-border bg-surface px-3 py-3 text-md text-fg outline-none transition-colors focus:border-brand-primary"
          />
          <span className="text-xs text-muted-warm">324 / 1000 characters</span>
        </label>
      </div>
      <div>
        <SectionLabel>Owner Information</SectionLabel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex size-24 items-center justify-center rounded-full border-2 border-brand-primary/20 bg-brand-primary/5">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#C1502E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <button type="button" className="text-sm font-semibold text-brand-primary">Change Photo</button>
          </div>
          <div className="flex flex-1 flex-col gap-4">
            <Input label="Owner Name" defaultValue="Meena Patel" />
            <Input label="Title / Role" defaultValue="Founder & Designer" />
          </div>
        </div>
      </div>
      <div>
        <SectionLabel>Social Links</SectionLabel>
        <div className="flex flex-col gap-3">
          {[
            { label: 'IG', value: 'https://instagram.com/meenasilks' },
            { label: 'FB', value: 'https://facebook.com/meenasilks' },
            { label: 'YT', value: 'https://youtube.com/@meenasilks' },
          ].map(({ label, value }) => (
            <div key={value} className="flex items-center gap-3 rounded-lg border border-border px-3 py-[11px]">
              <span className="flex size-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-muted-warm">{label}</span>
              <input defaultValue={value} className="min-w-0 flex-1 bg-transparent text-md text-fg outline-none" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>Trust Statistics</SectionLabel>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { value: '₹50L+ GMV', label: 'Label' },
            { value: '2K+ Customers', label: 'Label' },
            { value: '98% Rated', label: 'Label' },
          ].map((stat) => (
            <div key={stat.value} className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <input defaultValue={stat.value} className="bg-transparent text-sm font-semibold text-fg outline-none" />
              <input defaultValue={stat.label} className="bg-transparent text-xs text-muted-warm outline-none" placeholder="Label" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Store Tab ──
function StoreTab() {
  const [selectedColor, setSelectedColor] = useState('#C1502E')
  const [categories] = useState(['Sarees', 'Kurtis', 'Dupattas'])
  const [acceptReturns, setAcceptReturns] = useState(true)
  const [showWhatsApp, setShowWhatsApp] = useState(true)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Store Details</SectionLabel>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Store Name" defaultValue="Meena Silks" />
            <Input label="Tagline" defaultValue="Handcrafted for every occasion" />
          </div>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-semibold text-fg">Store URL</p>
              <p className="text-sm text-brand-primary">silk.mytalam.com</p>
            </div>
            <span className="ml-auto rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-warm">Ethnic Wear</span>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Categories</SectionLabel>
        <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-2 border-b border-border-light py-2 last:border-0">
              <GripVertical className="size-4 text-muted-warm" />
              <span className="flex-1 text-md text-fg">{cat}</span>
              <button type="button" className="text-muted-warm hover:text-danger"><X className="size-4" /></button>
            </div>
          ))}
          <div className="flex items-center gap-2 pt-1">
            <input placeholder="New category name..." className="min-w-0 flex-1 bg-transparent text-md text-fg outline-none" />
            <button type="button" className="rounded-lg border border-brand-primary px-3 py-1 text-sm font-semibold text-brand-primary">Add</button>
          </div>
        </div>
        <p className="mt-1.5 text-xs text-muted-warm">Categories appear in your shop filters and home page. Drag to reorder.</p>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Brand</SectionLabel>
        <div className="flex items-center gap-[14px] rounded-lg border border-border p-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10">
            <span className="text-sm font-bold tracking-[0.04em] text-brand-primary">MS</span>
          </div>
          <div className="grow">
            <p className="text-md font-semibold text-fg">Store Logo</p>
            <p className="text-xs text-muted-warm">PNG or SVG, min 200×200px</p>
          </div>
          <button type="button" className="rounded-lg border border-border px-[14px] py-2 text-sm font-semibold text-fg">Change Logo</button>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-warm">Primary Colour</p>
          <div className="flex flex-wrap items-center gap-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={`size-10 shrink-0 rounded-full transition-transform active:scale-90 ${color === selectedColor ? 'ring-[3px] ring-fg ring-offset-2' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
            <input
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
              className="min-w-[100px] grow rounded-lg border border-border px-[10px] py-2 font-mono text-md text-fg"
            />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>Delivery & Trust</SectionLabel>
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg">Free Delivery Above</span>
              <div className="flex items-center rounded-lg border border-border px-2 py-[9px]">
                <span className="text-muted-warm">₹</span>
                <input defaultValue="500" className="ml-1 min-w-0 flex-1 bg-transparent text-md text-fg outline-none" />
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fg">Shipping Fee</span>
              <div className="flex items-center rounded-lg border border-border px-2 py-[9px]">
                <span className="text-muted-warm">₹</span>
                <input defaultValue="60" className="ml-1 min-w-0 flex-1 bg-transparent text-md text-fg outline-none" />
              </div>
            </label>
            <Input label="Delivery Estimate" defaultValue="5–7 business days" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Accept Returns</p>
              <p className="text-xs text-muted-warm">Show return window on product pages</p>
            </div>
            <div className="flex items-center gap-2">
              <input defaultValue="7" className="w-12 rounded-lg border border-border px-2 py-1 text-center text-sm text-fg" />
              <span className="text-xs text-muted-warm">days</span>
              <Toggle checked={acceptReturns} onChange={setAcceptReturns} />
            </div>
          </div>
          <Input label="Trust Badge Text" defaultValue="100% authentic, handpicked by Meena" />
        </div>
      </div>

      <div>
        <SectionLabel right={<span className="text-xs font-medium text-success">✓ Autosaves</span>}>WhatsApp</SectionLabel>
        <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">WhatsApp Number</span>
            <div className="flex items-center gap-2">
              <span className="rounded-lg border border-border px-3 py-[9px] text-sm text-muted-warm">+91</span>
              <input defaultValue="98765 43210" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-[9px] text-md text-fg outline-none focus:border-brand-primary" />
            </div>
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
              <p className="text-xs text-muted-warm">Floating button visible to all visitors</p>
            </div>
            <Toggle checked={showWhatsApp} onChange={setShowWhatsApp} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Alerts Tab ──
function AlertsTab() {
  const sections = [
    {
      label: 'Order Alerts',
      items: [
        { name: 'New order placed', sub: 'Email you when a customer places an order', on: true },
        { name: 'Order status updated', sub: 'Confirmation when you update an order\'s status', on: true },
        { name: 'Order cancelled', sub: 'Alert when an order is cancelled by customer or you', on: true },
        { name: 'Low stock warning', sub: 'When a product drops below 5 units', on: true },
      ],
    },
    {
      label: 'Payment Alerts',
      items: [
        { name: 'Payment received', sub: 'Confirm when a customer\'s payment is verified', on: true },
        { name: 'Payment failed / UTR pending', sub: 'When UPI customer hasn\'t submitted UTR after 2 hours', on: true },
        { name: 'Refund initiated', sub: 'Alert when a refund is triggered via gateway', on: true },
      ],
    },
    {
      label: 'Customer Alerts',
      items: [
        { name: 'New customer registered', sub: 'When a new customer creates an account on your store', on: false },
        { name: 'Wishlist abandoned', sub: 'Customer wishlisted an item but hasn\'t purchased in 3 days', on: false },
      ],
    },
    {
      label: 'Review Alerts',
      items: [
        { name: 'New review submitted', sub: 'When a customer leaves a product review', on: false },
        { name: 'Review reported', sub: 'When a customer flags a review as inappropriate', on: true },
      ],
    },
    {
      label: 'Platform Alerts',
      items: [
        { name: 'Trial expiry reminder', sub: '1 day before your trial ends', on: true },
        { name: 'Monthly summary report', sub: 'Monthly digest of orders, revenue, and top products', on: false },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <div key={section.label}>
          <SectionLabel>{section.label}</SectionLabel>
          <div className="flex flex-col divide-y divide-border-light rounded-lg border border-border">
            {section.items.map((item) => (
              <AlertRow key={item.name} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertRow({ name, sub, on: defaultOn }: { name: string; sub: string; on: boolean }) {
  const [checked, setChecked] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <div>
        <p className="text-md font-semibold text-fg">{name}</p>
        <p className="text-xs text-muted-warm">{sub}</p>
      </div>
      <Toggle checked={checked} onChange={setChecked} />
    </div>
  )
}

// ── Promotions Tab ──
function PromotionsTab() {
  const offers = [
    { code: 'DIWALI20', discount: '20% OFF', min: '₹500+', applies: 'All products', uses: '12 / 50', expires: 'Oct 31, 2026', active: true },
    { code: 'SUMMER10', discount: '₹100 OFF', min: '₹800+', applies: 'Kurtis, Sarees', uses: '3 / 100', expires: 'No expiry', active: false },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-warm">Active Offers</p>
          <button type="button" className="rounded-lg border border-brand-primary px-4 py-2 text-sm font-semibold text-brand-primary">+ Create Offer</button>
        </div>
        {/* Mobile: card list */}
        <div className="flex flex-col gap-3 md:hidden">
          {offers.map((o) => (
            <div key={o.code} className="rounded-lg border border-border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-brand-primary">{o.code}</span>
                <Toggle checked={o.active} onChange={() => {}} />
              </div>
              <p className="text-sm font-semibold text-fg">{o.discount} · Min {o.min}</p>
              <p className="text-xs text-muted-warm">{o.applies} · {o.uses} uses · {o.expires}</p>
            </div>
          ))}
        </div>
        {/* Desktop: table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Discount</th>
                <th className="pb-2 pr-4">Min Order</th>
                <th className="pb-2 pr-4">Applies To</th>
                <th className="pb-2 pr-4">Uses</th>
                <th className="pb-2 pr-4">Expires</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.code} className="border-b border-border-light">
                  <td className="py-3 pr-4 font-mono font-bold text-brand-primary">{o.code}</td>
                  <td className="py-3 pr-4 font-semibold text-fg">{o.discount}</td>
                  <td className="py-3 pr-4 text-muted-warm">{o.min}</td>
                  <td className="py-3 pr-4 text-muted-warm">{o.applies}</td>
                  <td className="py-3 pr-4 text-muted-warm">{o.uses}</td>
                  <td className="py-3 pr-4 text-muted-warm">{o.expires}</td>
                  <td className="py-3 pr-4"><Toggle checked={o.active} onChange={() => {}} /></td>
                  <td className="py-3"><button type="button" className="text-muted-warm hover:text-danger"><X className="size-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Subscription Tab ──
function SubscriptionTab() {
  const plans = [
    { name: 'Trial', price: 'Free / 14 days', features: ['25 products', '100 OTP logins/mo'], missing: ['WhatsApp button', 'Discount codes', 'Wishlist'], note: 'Powered by badge shown', current: false },
    { name: 'Starter', price: '₹499 /mo', features: ['100 products', '500 OTP logins/mo', 'WhatsApp button', 'Discount codes', 'Wishlist'], missing: [], note: 'Badge hidden', current: true },
    { name: 'Pro', price: '₹1,499 /mo', features: ['Unlimited products', '2,000 OTP logins/mo', 'WhatsApp button', 'Advanced analytics', 'Priority support'], missing: [], note: 'Badge hidden', current: false },
  ]
  const history = [
    { date: 'Jun 28, 2026', plan: 'Starter Monthly', amount: '₹499', status: 'Paid' },
    { date: 'May 28, 2026', plan: 'Starter Monthly', amount: '₹499', status: 'Paid' },
    { date: 'Apr 28, 2026', plan: 'Starter Monthly', amount: '₹499', status: 'Paid' },
  ]

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 rounded-lg border-2 border-brand-primary/30 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-lg font-bold text-fg">Starter Plan <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">ACTIVE</span></p>
          <p className="text-sm text-muted-warm">Renews on July 28, 2026 · ₹499/mo</p>
        </div>
        <div className="md:text-right">
          <p className="font-marketing text-[32px] font-semibold text-brand-primary">₹499/mo</p>
          <button type="button" className="mt-1 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg">Manage Billing</button>
        </div>
      </div>

      <div>
        <SectionLabel>Available Plans</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={`flex flex-col rounded-lg border-2 p-5 ${plan.current ? 'border-brand-primary' : 'border-border'}`}>
              {plan.current && <span className="mb-2 self-center rounded-full bg-brand-primary px-3 py-0.5 text-2xs font-bold text-surface">CURRENT</span>}
              <p className={`text-md font-bold ${plan.current ? 'text-brand-primary' : 'text-fg'}`}>{plan.name}</p>
              <p className="font-marketing mb-3 text-xl font-semibold text-fg">{plan.price}</p>
              <div className="flex flex-col gap-1 text-sm">
                {plan.features.map((f) => <span key={f} className="text-fg">✓ {f}</span>)}
                {plan.missing.map((f) => <span key={f} className="text-muted-warm">✕ {f}</span>)}
                <span className="mt-1 text-xs text-muted-warm">{plan.note}</span>
              </div>
              {plan.name === 'Pro' && (
                <button type="button" className="mt-4 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-surface">Upgrade to Pro</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Payment History</SectionLabel>
        {/* Desktop table */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-bold uppercase tracking-[0.06em] text-muted-warm">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Plan</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.date} className="border-b border-border-light">
                  <td className="py-3 pr-4 text-fg">{h.date}</td>
                  <td className="py-3 pr-4 text-fg">{h.plan}</td>
                  <td className="py-3 pr-4 font-semibold text-fg">{h.amount}</td>
                  <td className="py-3 pr-4"><span className="rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">{h.status}</span></td>
                  <td className="py-3"><button type="button" className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg">Invoice</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="flex flex-col gap-2 sm:hidden">
          {history.map((h) => (
            <div key={h.date} className="flex items-center justify-between rounded-lg border border-border-light p-3">
              <div>
                <p className="text-sm font-semibold text-fg">{h.amount} · {h.plan}</p>
                <p className="text-xs text-muted-warm">{h.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">{h.status}</span>
                <button type="button" className="rounded-lg border border-border px-3 py-1 text-xs font-semibold text-fg">Invoice</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Payments Tab ──
function PaymentsTab() {
  const [upiEnabled, setUpiEnabled] = useState(true)
  const [instamojoEnabled, setInstamojoEnabled] = useState(false)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-lg bg-[#FEF3C7] p-4">
        <AlertTriangle className="size-5 shrink-0 text-amber" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#92400E]">3 pending orders — payment settings locked</p>
          <p className="text-xs text-[#92400E]/70">Complete or cancel all orders before changing payment configuration.</p>
        </div>
        <Link href="/admin/orders" className="shrink-0 text-sm font-semibold text-fg">Go to Orders →</Link>
      </div>

      <p className="text-sm text-muted-warm">Money goes directly to your bank. Talam never holds funds. Enable any or all gateways — customers choose at checkout.</p>

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border border-border p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#1A1040] text-xs font-bold text-amber">UPI</span>
              <div>
                <p className="text-md font-semibold text-fg">UPI / QR Code</p>
                <p className="text-xs text-muted-warm">0% fee · No KYC required</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {upiEnabled && <span className="rounded-full bg-success-bg px-2 py-0.5 text-2xs font-semibold text-success">Enabled</span>}
              <Toggle checked={upiEnabled} onChange={setUpiEnabled} />
            </div>
          </div>
          {upiEnabled && (
            <div>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-fg">UPI ID</span>
                <input defaultValue="meena@ybl" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg outline-none focus:border-brand-primary" />
              </label>
              <p className="mt-1 text-xs text-muted-warm">Customers scan your QR and share UTR manually to confirm payment</p>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#4A154B] text-[9px] font-bold text-surface">MOJO</span>
              <div>
                <p className="text-md font-semibold text-fg">Instamojo <span className="ml-1 rounded-full bg-amber/10 px-2 py-0.5 text-2xs font-semibold text-amber">RECOMMENDED</span></p>
                <p className="text-xs text-muted-warm">2% + ₹3 per transaction · PAN + savings account</p>
              </div>
            </div>
            <Toggle checked={instamojoEnabled} onChange={setInstamojoEnabled} />
          </div>
        </div>

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted-warm">2% per transaction · Existing account required</p>
              </div>
            </div>
            <Toggle checked={razorpayEnabled} onChange={setRazorpayEnabled} />
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted-warm">🔒 Settings are locked while you have pending orders.</p>
    </div>
  )
}

// ── Contact Info Tab ──
function ContactInfoTab() {
  const [showWhatsApp, setShowWhatsApp] = useState(true)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Owner</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Owner Name" defaultValue="Meena Patel" />
          <Input label="Title / Role" defaultValue="Founder & Designer" />
        </div>
      </div>

      <div>
        <SectionLabel>Contact Details</SectionLabel>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Contact Phone" defaultValue="+91 98765 43210" />
            <Input label="Contact Email" defaultValue="hello@meenasilks.com" />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">WhatsApp Number</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-border px-3 py-[9px] text-sm text-muted-warm">+91</span>
              <input defaultValue="98765 43210" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-[9px] text-md text-fg outline-none focus:border-brand-primary" />
              <label className="flex shrink-0 items-center gap-1.5 text-sm text-muted-warm">
                <input type="checkbox" defaultChecked className="size-4 accent-brand-primary" />
                Same as contact phone
              </label>
            </div>
          </label>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-md font-semibold text-fg">Show WhatsApp Button on Store</p>
              <p className="text-xs text-muted-warm">Floating button visible to all visitors</p>
            </div>
            <Toggle checked={showWhatsApp} onChange={setShowWhatsApp} />
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Store Location & Demographics</SectionLabel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Input label="City" defaultValue="Chennai" />
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">State</span>
            <select defaultValue="Tamil Nadu" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg">
              <option>Tamil Nadu</option>
              <option>Karnataka</option>
              <option>Kerala</option>
            </select>
          </label>
          <Input label="Pincode" defaultValue="600001" />
          <Input label="Country" defaultValue="India" />
        </div>
        <p className="mt-1.5 text-xs text-muted-warm">Used to show delivery estimates and localise your store experience for customers.</p>
      </div>

      <div>
        <SectionLabel>Store Photos</SectionLabel>
        <div className="flex gap-3 overflow-x-auto">
          {['bg-[#E8C4B0]', 'bg-[#D4A0C0]', 'bg-[#A0C4D4]'].map((bg, i) => (
            <div key={i} className={`size-24 shrink-0 rounded-lg ${bg}`} />
          ))}
          <button type="button" className="flex size-24 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-warm">
            <span className="text-2xl">+</span>
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted-warm">Max 8 photos. These appear on your About page and social share previews.</p>
      </div>

      <div>
        <SectionLabel>Store Hours</SectionLabel>
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <div className="flex items-center gap-4">
            <span className="w-20 text-sm font-semibold text-fg">Mon – Sat</span>
            <input defaultValue="10 AM – 7 PM" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-[9px] text-md text-fg outline-none" />
          </div>
          <div className="flex items-center gap-4">
            <span className="w-20 text-sm font-semibold text-fg">Sunday</span>
            <input defaultValue="Closed" className="min-w-0 flex-1 rounded-lg border border-border px-3 py-[9px] text-md text-muted-warm outline-none" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Delete Store Tab ──
function DeleteStoreTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg bg-danger/5 p-5">
        <p className="text-md font-bold text-danger">This action cannot be undone</p>
        <p className="mt-1 text-sm text-danger/80">Deleting your store will immediately take it offline. Your data will be permanently deleted after 30 days.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-fg">What gets deleted:</p>
        <div className="flex flex-col gap-1 text-sm text-muted-warm">
          <span>✕ All products and product images</span>
          <span>✕ All customer orders and history</span>
          <span>✕ Your store URL (silk.mytalam.com)</span>
          <span>✕ Payment gateway connections</span>
        </div>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-fg">Type your store name to confirm</span>
        <input placeholder="Meena Silks" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg outline-none focus:border-danger" />
      </label>

      <button type="button" className="w-full rounded-lg bg-danger py-3.5 text-md font-semibold text-surface transition-colors hover:bg-danger/90">
        Delete Store
      </button>
      <p className="text-center text-xs text-muted-warm">Your store goes read-only immediately. Hard-deleted after 30 days.</p>
    </div>
  )
}

// ── Main Page ──
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Store')

  return (
    <div className="mx-auto max-w-3xl">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard" className="flex size-8 items-center justify-center">
            <ChevronLeft className="size-5 text-fg" />
          </Link>
          <span className="font-marketing text-lg font-semibold text-fg">Store Settings</span>
        </div>
        <button className="rounded-lg bg-brand-primary px-4 py-[7px] text-sm font-semibold text-surface">Save</button>
      </div>

      {/* Desktop header */}
      <div className="mb-1 hidden items-center justify-between md:flex">
        <h1 className="font-marketing text-[26px] font-semibold text-fg">Store Settings</h1>
        <button className="rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95">Save Changes</button>
      </div>

      {/* Tab bar */}
      <div className="-mx-4 flex gap-0 overflow-x-auto border-b border-border px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0">
        {[...TABS, 'Delete Store' as const].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer px-4 py-3 text-sm font-medium transition-colors ${
              tab === activeTab
                ? tab === 'Delete Store'
                  ? 'border-b-2 border-danger text-danger'
                  : 'border-b-2 border-brand-primary text-fg'
                : tab === 'Delete Store'
                  ? 'text-danger/60 hover:text-danger'
                  : 'text-muted-warm hover:text-fg'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="px-4 py-6 md:px-0">
        {activeTab === 'About' && <AboutTab />}
        {activeTab === 'Store' && <StoreTab />}
        {activeTab === 'Alerts' && <AlertsTab />}
        {activeTab === 'Promotions' && <PromotionsTab />}
        {activeTab === 'Subscription' && <SubscriptionTab />}
        {activeTab === 'Payments' && <PaymentsTab />}
        {activeTab === 'Contact Info' && <ContactInfoTab />}
        {activeTab === 'Delete Store' && <DeleteStoreTab />}
      </div>
    </div>
  )
}
