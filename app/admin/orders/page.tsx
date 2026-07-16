'use client'

import { useState } from 'react'
import { Search, ArrowUpDown } from 'lucide-react'
import { OrderActionSheet } from '@/components/admin/order-action-sheet'
import { OrderDetailsModal } from '@/components/admin/order-details-modal'

type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered'

export type MockOrder = {
  code: string
  time: string
  customer: string
  customerShort: string
  email: string
  mobile: string
  category: string
  count: number
  items: string
  price: string
  priceNum: number
  date: string
  status: OrderStatus
  address: string
}

const STATUS_DOT: Record<OrderStatus, string> = {
  Pending:   '#FB923C',
  Confirmed: '#6366F1',
  Shipped:   '#3B82F6',
  Delivered: '#22C55E',
}

const STATUS_STYLE: Record<OrderStatus, { border: string; bg: string; text: string }> = {
  Pending:   { border: '#FB923C', bg: '#FB923C1A', text: '#9A3412' },
  Confirmed: { border: '#6366F1', bg: '#6366F11A', text: '#4338CA' },
  Shipped:   { border: '#3B82F6', bg: '#3B82F61A', text: '#1D4ED8' },
  Delivered: { border: '#22C55E', bg: '#22C55E1A', text: '#166534' },
}

const MOCK_ORDERS: MockOrder[] = [
  { code: '#ORD-2648', time: 'Today · 08:14am', customer: 'Ananya Krishnan', customerShort: 'Ananya K.', email: 'ananya@mail.com', mobile: '+91 98765 43210', category: 'Ethnic Wear', count: 1, items: 'Block Print Kurti (L) · 1 item', price: '₹649', priceNum: 649, date: 'Today', status: 'Pending', address: 'Apartment 5, Building A\nPrestige Iris Heights\nBangalore, Karnataka 560034\nIndia' },
  { code: '#ORD-2646', time: 'Yesterday · 3:22pm', customer: 'Rekha Mohan', customerShort: 'Rekha M.', email: 'rekha.mohan@mail.com', mobile: '+91 87654 32109', category: 'Sarees', count: 1, items: 'Chanderi Saree (Free) · 1 item', price: '₹2,499', priceNum: 2499, date: 'Yesterday', status: 'Pending', address: '12, MG Road\nChennai, Tamil Nadu 600001\nIndia' },
  { code: '#ORD-2647', time: 'Yesterday · 6:55pm', customer: 'Deepa Subramanian', customerShort: 'Deepa S.', email: 'deepa.sub@mail.com', mobile: '+91 76543 21098', category: 'Kurtis', count: 2, items: 'Anarkali Set (S) + Dupatta · 2 items', price: '₹2,198', priceNum: 2198, date: 'Yesterday', status: 'Shipped', address: '45, Jubilee Hills\nHyderabad, Telangana 500033\nIndia' },
  { code: '#ORD-2645', time: '2 days ago', customer: 'Meera Verma', customerShort: 'Meera V.', email: 'meera.verma@mail.com', mobile: '+91 65432 10987', category: 'Dupattas', count: 2, items: 'Cotton Dupatta + Salwar · 2 items', price: '₹1,850', priceNum: 1850, date: '2 days ago', status: 'Delivered', address: '78, Sector 17\nChandigarh 160017\nIndia' },
  { code: '#ORD-2644', time: '3 days ago', customer: 'Priya Singh', customerShort: 'Priya S.', email: 'priya.singh@mail.com', mobile: '+91 54321 09876', category: 'Sarees', count: 1, items: 'Banarasi Silk Saree · 1 item', price: '₹3,299', priceNum: 3299, date: '3 days ago', status: 'Confirmed', address: '23, Lajpat Nagar\nNew Delhi 110024\nIndia' },
  { code: '#ORD-2643', time: '4 days ago', customer: 'Neha Desai', customerShort: 'Neha D.', email: 'neha.desai@mail.com', mobile: '+91 43210 98765', category: 'Kurtis', count: 2, items: 'Cotton Kurta Set · 2 items', price: '₹1,999', priceNum: 1999, date: '4 days ago', status: 'Shipped', address: '56, Koregaon Park\nPune, Maharashtra 411001\nIndia' },
  { code: '#ORD-2642', time: '5 days ago', customer: 'Anjali Patel', customerShort: 'Anjali P.', email: 'anjali.patel@mail.com', mobile: '+91 32109 87654', category: 'Ethnic Wear', count: 3, items: 'Anarkali Set + Dupatta · 3 items', price: '₹4,250', priceNum: 4250, date: '5 days ago', status: 'Delivered', address: '89, CG Road\nAhmedabad, Gujarat 380009\nIndia' },
]

type FilterKey = 'All' | OrderStatus
const FILTERS: FilterKey[] = ['All', 'Pending', 'Confirmed', 'Shipped', 'Delivered']

function filterCount(key: FilterKey) {
  if (key === 'All') return MOCK_ORDERS.length
  return MOCK_ORDERS.filter((o) => o.status === key).length
}

export default function AdminOrdersPage() {
  const [actionOrder, setActionOrder] = useState<MockOrder | null>(null)
  const [detailOrder, setDetailOrder] = useState<MockOrder | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterKey>('All')
  const [sortAsc, setSortAsc] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = MOCK_ORDERS
    .filter((o) => activeFilter === 'All' || o.status === activeFilter)
    .filter((o) => !search || o.customer.toLowerCase().includes(search.toLowerCase()) || o.code.toLowerCase().includes(search.toLowerCase()))
  const sorted = sortAsc ? [...filtered].reverse() : filtered

  const totalValue = MOCK_ORDERS.reduce((s, o) => s + o.priceNum, 0)
  const pendingCount = MOCK_ORDERS.filter((o) => o.status === 'Pending').length

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {/* ── Header ── */}
      <div className="flex items-end justify-between pb-5 pt-2 md:pt-0">
        <div>
          <p className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-warm">{MOCK_ORDERS.length} orders</p>
          <h1 className="font-marketing mt-1 text-[26px] font-semibold leading-tight text-fg md:text-[32px]">
            Orders
          </h1>
        </div>
        {/* Desktop search + sort */}
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex h-9 w-[220px] items-center gap-2 rounded-lg border border-border-light bg-surface px-3">
            <Search className="size-3.5 text-muted-warm" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="grow bg-transparent text-sm text-fg outline-none placeholder:text-muted-warm"
              placeholder="Search orders..."
            />
          </div>
          <button
            onClick={() => setSortAsc(!sortAsc)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border-light px-3 py-[7px] text-xs font-medium text-muted-warm transition-colors hover:text-fg"
          >
            <ArrowUpDown className="size-3.5" />
            {sortAsc ? 'Oldest' : 'Latest'}
          </button>
        </div>
        {/* Mobile search */}
        <button className="flex size-8 items-center justify-center md:hidden">
          <Search className="size-5 text-fg" strokeWidth={2} />
        </button>
      </div>

      {/* ── Summary strip ── */}
      <div className="mb-5 flex items-start gap-0">
        <div className="flex-1 border-r border-border-light pr-5">
          <p className="text-xs font-medium text-muted-warm">Total Value</p>
          <p className="font-marketing mt-0.5 text-[22px] font-semibold leading-tight text-fg">
            ₹{totalValue.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="flex-1 pl-5">
          <p className="text-xs font-medium text-muted-warm">Needs Attention</p>
          <p className="font-marketing mt-0.5 text-[22px] font-semibold leading-tight text-fg">
            {pendingCount} <span className="text-sm font-normal text-muted-warm">pending</span>
          </p>
        </div>
      </div>

      {/* ── Filter pills ── */}
      <div className="mb-5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((key) => {
          const active = key === activeFilter
          const count = filterCount(key)
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              className={`shrink-0 cursor-pointer rounded-full px-4 py-[6px] text-xs font-semibold transition-colors ${
                active
                  ? 'bg-fg text-surface'
                  : 'text-muted-warm hover:text-fg'
              }`}
            >
              {key} ({count})
            </button>
          )
        })}
      </div>

      {/* ── Mobile: order cards ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {sorted.map((order) => (
          <button
            key={order.code}
            onClick={() => setDetailOrder(order)}
            className="cursor-pointer rounded-lg border border-border-light p-3.5 text-left transition-colors active:bg-bg"
          >
            <div className="mb-2.5 flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-fg">{order.customer}</p>
                <p className="mt-0.5 text-xs text-muted-warm">{order.code} · {order.time.split('·')[0].trim()}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[order.status] }} />
                <span className="text-xs font-medium text-muted-warm">{order.status}</span>
              </div>
            </div>
            <p className="mb-3 truncate text-xs text-muted-warm">{order.items}</p>
            <div className="flex items-center justify-between">
              <span className="font-marketing text-lg font-semibold text-fg">{order.price}</span>
              <span
                onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
                className="rounded-md bg-brand-primary px-3.5 py-[5px] text-xs font-semibold text-surface transition-transform active:scale-95"
              >
                Action
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Desktop: clean table ── */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[1fr_2fr_auto_auto_auto_auto] gap-x-6 border-b border-border-light pb-2 text-xs font-medium uppercase tracking-[0.06em] text-muted-warm">
          <span>Customer</span>
          <span>Items</span>
          <span className="text-right">Amount</span>
          <span className="text-center">Status</span>
          <span>Date</span>
          <span />
        </div>
        {sorted.map((order) => (
          <div
            key={order.code}
            onClick={() => setDetailOrder(order)}
            className="grid cursor-pointer grid-cols-[1fr_2fr_auto_auto_auto_auto] items-center gap-x-6 border-b border-border-light py-3.5 transition-colors hover:bg-bg"
          >
            <div>
              <p className="text-sm font-semibold text-fg">{order.customer}</p>
              <p className="text-xs text-muted-warm">{order.code}</p>
            </div>
            <p className="truncate text-sm text-muted-warm">{order.items}</p>
            <p className="font-marketing min-w-[72px] text-right text-[15px] font-semibold text-fg">{order.price}</p>
            <div className="flex min-w-[90px] items-center justify-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: STATUS_DOT[order.status] }} />
              <span className="text-xs font-medium text-fg">{order.status}</span>
            </div>
            <span className="min-w-[80px] text-xs text-muted-warm">{order.date}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setActionOrder(order) }}
              className="min-w-[72px] cursor-pointer rounded-md bg-brand-primary px-3 py-[5px] text-center text-xs font-semibold text-surface transition-transform active:scale-95"
            >
              Action
            </button>
          </div>
        ))}
      </div>

      {actionOrder && <OrderActionSheet order={actionOrder} onClose={() => setActionOrder(null)} onViewDetails={(o) => { setActionOrder(null); setDetailOrder(o) }} />}
      {detailOrder && <OrderDetailsModal order={detailOrder} onClose={() => setDetailOrder(null)} />}
    </div>
  )
}
