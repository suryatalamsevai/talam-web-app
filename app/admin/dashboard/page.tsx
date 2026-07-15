'use client'

import { useState } from 'react'
import { ChevronRight, Clock, Package, AlertTriangle, ExternalLink } from 'lucide-react'

type MockStat = { label: string; value: string; change: string; up: boolean }
const MOCK_STATS: MockStat[] = [
  { label: 'Revenue', value: '₹24,500', change: '+18% vs yesterday', up: true },
  { label: 'Orders', value: '38', change: '-5% vs yesterday', up: false },
  { label: 'Customers', value: '142', change: '+3 new today', up: true },
  { label: 'Avg Order Value', value: '₹645', change: '+₹120 vs yesterday', up: true },
]

type MockAlert = { text: string; sub: string; tone: 'amber' | 'danger'; icon: typeof Clock }
const MOCK_ALERTS: MockAlert[] = [
  { text: '3 orders awaiting confirmation', sub: 'Pending for over 2 hours', tone: 'amber', icon: Clock },
  { text: '2 items running low', sub: 'Less than 5 units remaining', tone: 'amber', icon: Package },
  { text: '1 payment failed — Razorpay', sub: 'Order #1042 · ₹1,850', tone: 'danger', icon: AlertTriangle },
]

type MockOrder = { code: string; time: string; customer: string; items: string; price: string; status: 'Pending' | 'Confirmed' | 'Delivered'; statusColor: string }
const MOCK_ORDERS: MockOrder[] = [
  { code: '#1045', time: '3h ago', customer: 'Priya Sharma', items: '2× Kurta Set, 1× Dupatta', price: '₹1,850', status: 'Pending', statusColor: 'bg-[#FEF3C7] text-[#92400E]' },
  { code: '#1044', time: '1h ago', customer: 'Rahul Verma', items: '1× Silk Banarasi Saree', price: '₹3,200', status: 'Confirmed', statusColor: 'bg-[#DBEAFE] text-[#1D4ED8]' },
  { code: '#1043', time: 'Yesterday', customer: 'Ananya Patel', items: '3× Cotton Kurta', price: '₹2,100', status: 'Delivered', statusColor: 'bg-success-bg text-[#065F46]' },
]

type MockProduct = { name: string; sold: string; stock: string; stockColor: string; bg: string; iconColor: string }
const MOCK_PRODUCTS: MockProduct[] = [
  { name: 'Cotton Kurta Set', sold: '24 sold', stock: 'In stock', stockColor: 'text-success', bg: 'bg-[#EDE9FE]', iconColor: 'text-brand-primary' },
  { name: 'Silk Banarasi Saree', sold: '18 sold', stock: 'Low (3 left)', stockColor: 'text-amber', bg: 'bg-[#FEF3C7]', iconColor: 'text-amber' },
  { name: 'Anarkali Suit', sold: '15 sold', stock: 'In stock', stockColor: 'text-success', bg: 'bg-[#DBEAFE]', iconColor: 'text-[#3B82F6]' },
]

const TABS = ['Today', 'Yesterday', 'This Week', 'This Month']

// Smooth cubic bezier curve matching Paper's chart shape
const CHART_LINE = 'M0,130 C20,125 40,115 57,105 C74,95 90,75 114,65 C138,55 150,58 171,55 C192,52 210,42 228,38 C246,34 265,32 285,35 C305,38 322,48 342,42 C362,36 380,22 400,15'
const CHART_FILL = CHART_LINE + ' L400,150 L0,150 Z'
const CHART_DOTS: [number, number][] = [[0, 130], [57, 105], [114, 65], [171, 55], [228, 38], [285, 35], [342, 42], [400, 15]]

function BagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function ActionRequiredSection() {
  return (
    <section className="px-4 py-4 md:px-0">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-danger">Action Required</p>
      <div className="flex flex-col gap-2">
        {MOCK_ALERTS.map((alert) => {
          const Icon = alert.icon
          return (
            <button
              key={alert.text}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-[14px] py-3 text-left transition-colors hover:brightness-95 ${
                alert.tone === 'amber'
                  ? 'border-l-[3px] border-l-amber bg-[#F59E0B0F]'
                  : 'border-l-[3px] border-l-danger bg-[#EF44440F]'
              }`}
            >
              <Icon className={`size-5 shrink-0 ${alert.tone === 'amber' ? 'text-amber' : 'text-danger'}`} strokeWidth={2} />
              <div className="min-w-0 grow">
                <p className="text-sm font-semibold text-fg">{alert.text}</p>
                <p className="text-xs text-muted-warm">{alert.sub}</p>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-warm" />
            </button>
          )
        })}
      </div>
    </section>
  )
}

function TopProductsSection() {
  return (
    <section className="px-4 py-4 md:px-0">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-warm">Top Products</p>
        <button className="cursor-pointer text-sm font-medium text-brand-primary">View all</button>
      </div>
      {/* Mobile: horizontal scroll cards. Desktop: vertical list */}
      <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-col md:overflow-visible">
        {MOCK_PRODUCTS.map((product) => (
          <div key={product.name} className="flex shrink-0 cursor-pointer flex-col rounded-xl border border-border p-3 transition-colors hover:bg-bg md:flex-row md:items-center md:gap-3 md:p-[14px]" style={{ minWidth: '140px' }}>
            <div className={`mb-2 flex size-12 items-center justify-center rounded-xl ${product.bg} md:mb-0`}>
              <BagIcon className={`size-6 ${product.iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">{product.name}</p>
              <p className="text-xs text-muted-warm">{product.sold}</p>
              <p className={`text-xs font-semibold ${product.stockColor}`}>{product.stock}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('This Week')

  return (
    <div className="mx-auto max-w-[390px] md:max-w-none">
      <div className="flex justify-end px-4 pt-3 md:px-0 md:pt-0">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-brand-primary"
        >
          See live store
          <ExternalLink className="size-3.5" />
        </a>
      </div>

      {/* Time filter pills — scrollable with hidden scrollbar */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:mx-0 md:px-0 md:pb-4">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 cursor-pointer rounded-full px-4 py-[7px] text-xs font-semibold transition-colors ${
              tab === activeTab
                ? 'bg-brand-primary text-surface'
                : 'border border-border text-muted-warm hover:border-brand-primary hover:text-brand-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Mobile: Action Required FIRST (matches Paper mobile ordering) */}
      <div className="md:hidden">
        <ActionRequiredSection />
      </div>

      {/* Stats — mobile: 2x2, desktop: 4-col full width ABOVE the 2-col split */}
      <section className="grid grid-cols-2 gap-3 px-4 pb-4 md:grid-cols-4 md:px-0">
        {MOCK_STATS.map((stat) => (
          <div
            key={stat.label}
            className="cursor-pointer rounded-[10px] border border-[#E5E7EB] bg-white p-[14px] transition-colors hover:bg-bg"
          >
            <p className="mb-2 text-xs font-normal" style={{ color: '#6B7280' }}>{stat.label}</p>
            <p className="mb-1 text-2xl font-bold leading-[30px]" style={{ color: '#4F3FF0' }}>{stat.value}</p>
            <p className={`text-[11px] font-semibold leading-[14px] ${stat.up ? 'text-success' : 'text-danger'}`}>
              {stat.up ? '↑' : '↓'} {stat.change}
            </p>
          </div>
        ))}
      </section>

      {/* Desktop: 2-column layout */}
      <div className="md:flex md:gap-6">
        {/* Left column */}
        <div className="min-w-0 md:flex-1">
          {/* Revenue Trend Chart — smooth bezier curve */}
          <section className="mx-4 mb-4 rounded-[10px] border border-[#E5E7EB] p-4 md:mx-0">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-fg">Revenue Trend</p>
              <div className="flex gap-2">
                {['Revenue', 'Orders', 'Customers'].map((label, i) => (
                  <button
                    key={label}
                    className={`cursor-pointer rounded-full px-3 py-[5px] text-2xs font-semibold transition-colors ${
                      i === 0
                        ? 'bg-brand-primary text-surface'
                        : 'border border-border text-muted-warm hover:border-brand-primary hover:text-brand-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative h-[180px] w-full pl-8">
              <div className="absolute left-0 top-0 flex h-full flex-col justify-between pb-1 text-[11px]" style={{ color: '#6B7280' }}>
                <span>30k</span><span>20k</span><span>10k</span><span>0</span>
              </div>
              <svg viewBox="0 0 400 150" className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F3FF0" stopOpacity="0.10" />
                    <stop offset="100%" stopColor="#4F3FF0" stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <path d={CHART_FILL} fill="url(#chartGrad)" />
                <path d={CHART_LINE} fill="none" stroke="#4F3FF0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                {CHART_DOTS.map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3" fill="#4F3FF0" stroke="white" strokeWidth="2" />
                ))}
              </svg>
            </div>
            <div className="mt-2 flex justify-between pl-8 text-[11px]" style={{ color: '#6B7280' }}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </section>

          {/* Recent Orders */}
          <section className="px-4 py-4 md:px-0">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-warm">Recent Orders</p>
              <button className="cursor-pointer text-sm font-medium text-brand-primary">View all</button>
            </div>
            <div className="flex flex-col gap-3">
              {MOCK_ORDERS.map((order) => (
                <div key={order.code} className="cursor-pointer rounded-xl border border-border p-[14px] transition-colors hover:bg-bg">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="font-semibold text-muted-warm">{order.code}</span>
                    <span className="flex items-center gap-1 font-semibold text-muted-warm">
                      {order.status === 'Pending' && <Clock className="size-3" />}
                      {order.time}
                    </span>
                  </div>
                  <p className="mb-[2px] text-md font-bold text-fg">{order.customer}</p>
                  <p className="mb-[10px] text-sm text-muted-warm">{order.items}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[15px] font-bold text-fg">{order.price}</span>
                    <span className={`rounded-full px-[10px] py-1 text-2xs font-semibold ${order.statusColor}`}>{order.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right column — desktop only (mobile sections rendered above/below) */}
        <div className="hidden md:block md:w-[360px] md:shrink-0">
          <ActionRequiredSection />
          <TopProductsSection />
        </div>
      </div>

      {/* Mobile: Top Products after orders */}
      <div className="pb-4 md:hidden">
        <TopProductsSection />
      </div>
    </div>
  )
}
