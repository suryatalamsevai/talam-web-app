'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { mockGetOrders, type MockOrder, type MockOrderStatus } from '@/lib/mock-data'
import { ArrowLeft, Search, ChevronRight, X } from 'lucide-react'

const allOrders = mockGetOrders()

type Tab = 'All' | 'Active' | 'Delivered' | 'Cancelled' | 'Returns'

const statusColor: Record<MockOrderStatus, string> = {
  'Out for Delivery': 'bg-amber/10 text-amber border-amber/30',
  'Shipped': 'bg-blue-50 text-blue-600 border-blue-200',
  'Delivered': 'bg-success/10 text-success border-success/30',
  'Cancelled': 'bg-danger/10 text-danger border-danger/30',
  'Return Pickup': 'bg-purple-50 text-purple-600 border-purple-200',
}

const statusDot: Record<MockOrderStatus, string> = {
  'Out for Delivery': 'bg-amber',
  'Shipped': 'bg-blue-500',
  'Delivered': 'bg-success',
  'Cancelled': 'bg-danger',
  'Return Pickup': 'bg-purple-500',
}

const statusIcon: Record<MockOrderStatus, string> = {
  'Out for Delivery': '●',
  'Shipped': '●',
  'Delivered': '✓',
  'Cancelled': '✕',
  'Return Pickup': '●',
}

function tabFilter(tab: Tab): MockOrder[] {
  if (tab === 'All') return allOrders
  if (tab === 'Active') return allOrders.filter(o => o.status === 'Out for Delivery' || o.status === 'Shipped')
  if (tab === 'Delivered') return allOrders.filter(o => o.status === 'Delivered')
  if (tab === 'Cancelled') return allOrders.filter(o => o.status === 'Cancelled')
  return allOrders.filter(o => o.status === 'Return Pickup')
}

function tabCount(tab: Tab) { return tabFilter(tab).length }

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function OrderActions({ order }: { order: MockOrder }) {
  if (order.status === 'Out for Delivery' || order.status === 'Shipped') {
    return (
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border border-store-primary px-3 py-2 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5 sm:flex-none sm:px-4">
          Track Package
        </button>
        <button className="flex-1 rounded-lg border border-border px-3 py-2 font-body text-xs font-medium text-fg hover:bg-bg sm:flex-none sm:px-4">
          View Invoice
        </button>
      </div>
    )
  }
  if (order.status === 'Delivered') {
    return (
      <div className="flex gap-2">
        <button className="flex-1 rounded-lg border border-border px-3 py-2 font-body text-xs font-medium text-fg hover:bg-bg sm:flex-none sm:px-4">
          Buy Again
        </button>
        <button className="flex-1 rounded-lg border border-border px-3 py-2 font-body text-xs font-medium text-fg hover:bg-bg sm:flex-none sm:px-4">
          Return / Exchange
        </button>
      </div>
    )
  }
  if (order.status === 'Return Pickup') {
    return (
      <button className="w-full rounded-lg border border-store-primary px-4 py-2 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5 sm:w-auto">
        Track Return
      </button>
    )
  }
  return null
}

// Mobile card layout
function OrderCardMobile({ order }: { order: MockOrder }) {
  const mainItem = order.items[0]
  const extraCount = order.items.length - 1

  return (
    <div className="border-b border-border py-4 last:border-b-0">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-body text-xs sm:text-sm font-bold text-fg">#{order.orderId}</p>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-body text-[10px] sm:text-[11px] font-semibold shrink-0 ${statusColor[order.status]}`}>
          {statusIcon[order.status]} {order.status}
        </span>
      </div>
      <p className="mb-2 font-body text-[11px] text-muted-warm">{formatDate(order.date)}</p>

      <Link href={`/orders/${order.id}`} className="flex items-center gap-3 group">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-bg">
          {mainItem.product.images[0] && (
            <Image src={mainItem.product.images[0]} alt={mainItem.product.name} fill sizes="48px" className="object-cover" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-fg line-clamp-1 group-hover:text-store-primary">
            {mainItem.product.name}{extraCount > 0 ? ` + ${extraCount} more` : ''}
          </p>
          <p className="font-body text-xs text-muted-warm">
            {order.status === 'Shipped' && order.carrier ? `Expected ${order.expectedDate?.replace('Expected ', '')} · ${order.carrier} #${order.trackingId}` : ''}
            {order.status === 'Out for Delivery' ? order.expectedDate : ''}
            {order.status === 'Delivered' ? order.expectedDate : ''}
            {order.status === 'Cancelled' ? `Cancelled on ${formatDate(order.date)} · Refund: ₹${order.refundAmount?.toLocaleString('en-IN')}` : ''}
            {order.status === 'Return Pickup' ? order.returnWindow : ''}
          </p>
          <p className="font-body text-sm font-bold text-fg mt-0.5">₹{order.total.toLocaleString('en-IN')}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-warm" />
      </Link>

      <div className="mt-3">
        <OrderActions order={order} />
      </div>
    </div>
  )
}

// Desktop table row
function OrderRowDesktop({ order }: { order: MockOrder }) {
  const mainItem = order.items[0]
  const extraCount = order.items.length - 1

  return (
    <tr className="border-b border-border last:border-b-0 hover:bg-bg/50">
      <td className="py-4 pl-5 font-body text-sm font-bold text-fg">#{order.orderId}</td>
      <td className="py-4 font-body text-sm text-muted-warm">{formatDate(order.date)}</td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {order.items.slice(0, 2).map((item, i) => (
              <div key={i} className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-surface bg-bg">
                {item.product.images[0] && (
                  <Image src={item.product.images[0]} alt={item.product.name} fill sizes="40px" className="object-cover" />
                )}
              </div>
            ))}
          </div>
          <span className="font-body text-sm text-fg line-clamp-1">
            {mainItem.product.name}{extraCount > 0 ? ` + ${extraCount} more` : ''}
          </span>
        </div>
      </td>
      <td className="py-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-body text-xs font-semibold ${statusColor[order.status]}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${statusDot[order.status]}`} />
          {order.status}
        </span>
      </td>
      <td className="py-4 font-body text-sm font-bold text-fg">₹{order.total.toLocaleString('en-IN')}</td>
      <td className="py-4 pr-5">
        <div className="flex gap-2">
          {(order.status === 'Out for Delivery' || order.status === 'Shipped') && (
            <>
              <button className="rounded-lg bg-store-primary px-3 py-1.5 font-body text-xs font-semibold text-surface hover:opacity-90">Track</button>
              <button className="rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg">Invoice</button>
            </>
          )}
          {order.status === 'Delivered' && (
            <>
              <button className="rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg">Buy Again</button>
              <button className="rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg">Return</button>
              <button className="rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg">Invoice</button>
            </>
          )}
          {order.status === 'Cancelled' && (
            <button className="rounded-lg border border-border px-3 py-1.5 font-body text-xs font-medium text-fg hover:bg-bg">View Details</button>
          )}
          {order.status === 'Return Pickup' && (
            <button className="rounded-lg border border-store-primary px-3 py-1.5 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5">Track Return</button>
          )}
        </div>
      </td>
    </tr>
  )
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('All')
  const [search, setSearch] = useState('')
  const [mobileSearch, setMobileSearch] = useState(false)

  let orders = tabFilter(activeTab)
  if (search.trim()) {
    const q = search.toLowerCase()
    orders = orders.filter(o =>
      o.orderId.toLowerCase().includes(q) ||
      o.items.some(i => i.product.name.toLowerCase().includes(q))
    )
  }

  const tabs: Tab[] = ['All', 'Active', 'Delivered', 'Cancelled', 'Returns']

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-12 sm:py-10 overflow-x-hidden">
      {/* Header */}
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link href="/" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-bg transition-colors lg:hidden">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </Link>
          <div className="min-w-0">
            <h1 className="font-heading text-lg sm:text-[22px] font-bold leading-7 text-fg">My Orders</h1>
            <p className="mt-0.5 font-body text-xs sm:text-sm text-muted-warm">{allOrders.length} orders · Priya Rajan</p>
          </div>
        </div>
        {/* Search — desktop only in header */}
        <div className="relative hidden sm:block shrink-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="h-10 w-64 rounded-lg border border-border bg-surface pl-9 pr-3 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
          />
        </div>
        {/* Mobile search toggle */}
        <button className="shrink-0 sm:hidden" onClick={() => setMobileSearch(v => !v)}>
          <Search className="h-5 w-5 text-fg" />
        </button>
      </div>

      {/* Mobile search bar */}
      {mobileSearch && (
        <div className="relative mt-3 sm:hidden">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-warm" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            autoFocus
            className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-9 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
          />
          <button onClick={() => { setSearch(''); setMobileSearch(false) }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-warm" />
          </button>
        </div>
      )}

      {/* Tabs — scrollable pill bar */}
      <div className="mt-3 mb-4 sm:mt-4 sm:mb-5 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar">
          {tabs.map(tab => {
            const c = tabCount(tab)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 rounded-full px-3 sm:px-4 py-1.5 font-body text-xs sm:text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-fg text-surface'
                    : 'border border-border text-muted-warm hover:text-fg'
                }`}
              >
                {tab} ({c})
              </button>
            )
          })}
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-body text-sm text-muted-warm">No orders found.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-3 pl-5 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Order ID</th>
                  <th className="py-3 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Date</th>
                  <th className="py-3 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Items</th>
                  <th className="py-3 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Status</th>
                  <th className="py-3 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Total</th>
                  <th className="py-3 pr-5 text-left font-body text-[11px] font-semibold uppercase tracking-wide text-muted-warm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <OrderRowDesktop key={order.id} order={order} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden">
            {orders.map(order => (
              <OrderCardMobile key={order.id} order={order} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}
