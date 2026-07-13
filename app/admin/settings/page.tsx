'use client'

import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

const COLOR_PRESETS = ['#4F3FF0', '#EC4899', '#10B981', '#F59E0B', '#EF4444', '#0EA5E9']

export default function AdminSettingsPage() {
  const [selectedColor, setSelectedColor] = useState('#4F3FF0')
  const [notifyOrder, setNotifyOrder] = useState(true)
  const [notifyStock, setNotifyStock] = useState(true)
  const [notifyReview, setNotifyReview] = useState(false)

  return (
    <div className="mx-auto max-w-[390px] md:max-w-2xl">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Link href="/admin/dashboard" className="flex size-8 items-center justify-center">
            <ChevronLeft className="size-5 text-fg" />
          </Link>
          <span className="text-base font-bold text-fg">Settings</span>
        </div>
        <button className="text-sm font-semibold text-brand-primary">Save</button>
      </div>

      {/* Desktop header */}
      <div className="mb-6 hidden items-center justify-between md:flex">
        <h1 className="text-xl font-bold text-fg">Settings</h1>
        <button className="rounded-lg bg-brand-primary px-5 py-[9px] text-sm font-semibold text-surface transition-transform active:scale-95">Save Changes</button>
      </div>

      <form className="flex flex-col">
        {/* Store Details */}
        <p className="border-b border-brand-primary/30 px-4 pt-[14px] pb-2 text-xs font-bold uppercase tracking-wide text-muted-warm md:px-0">Store Details</p>
        <div className="flex flex-col gap-4 px-4 py-4 md:px-0">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">Store Name</span>
            <input name="name" defaultValue="Meena Silks" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-fg">Tagline</span>
            <input name="tagline" defaultValue="Handcrafted for every occasion" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg" />
          </label>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-fg">Contact Phone</span>
              <input name="contactPhone" defaultValue="+91 98765 43210" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-fg">Contact Email</span>
              <input name="contactEmail" defaultValue="hello@meenasilks.com" className="rounded-lg border border-border px-3 py-[11px] text-md text-fg" />
            </label>
          </div>
        </div>

        {/* Brand */}
        <p className="border-b border-brand-primary/30 px-4 pt-[14px] pb-2 text-xs font-bold uppercase tracking-wide text-muted-warm md:px-0">Brand</p>
        <div className="flex flex-col gap-4 px-4 py-4 md:px-0">
          <div className="flex items-center gap-[14px]">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-border bg-[#F0EDF8]">
              <span className="text-sm font-bold tracking-[0.04em] text-brand-primary">MS</span>
            </div>
            <div className="grow">
              <p className="text-md font-semibold text-fg">Store Logo</p>
              <p className="text-xs text-muted-warm">PNG or SVG, min 200×200px</p>
            </div>
            <button type="button" className="rounded-lg border border-border px-[14px] py-2 text-sm font-semibold text-fg transition-colors active:bg-bg">Change</button>
          </div>
          <div>
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
                name="brandColor"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="min-w-[120px] grow rounded-lg border border-border px-[10px] py-2 font-mono text-md text-fg"
              />
            </div>
          </div>
        </div>

        {/* Payment Gateways */}
        <p className="border-b border-brand-primary/30 px-4 pt-[14px] pb-2 text-xs font-bold uppercase tracking-wide text-muted-warm md:px-0">Payment Gateways</p>
        <div className="flex flex-col divide-y divide-border px-4 py-2 md:px-0">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-[30px] w-11 items-center justify-center rounded-[5px] bg-[#1A1040] text-[10px] font-bold text-amber">UPI</span>
              <div>
                <p className="text-md font-semibold text-fg">UPI / QR Code</p>
                <p className="text-xs font-semibold text-success">Connected</p>
              </div>
            </div>
            <button type="button" className="rounded-lg border border-border px-[14px] py-2 text-sm font-semibold text-fg transition-colors active:bg-bg">Change</button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-[30px] w-11 items-center justify-center rounded-[5px] bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted-warm">Not connected</p>
              </div>
            </div>
            <button type="button" className="rounded-lg border border-brand-primary px-[14px] py-2 text-sm font-semibold text-brand-primary transition-colors active:bg-brand-primary/5">Connect</button>
          </div>
        </div>

        {/* Notifications */}
        <p className="border-b border-brand-primary/30 px-4 pt-[14px] pb-2 text-xs font-bold uppercase tracking-wide text-muted-warm md:px-0">Notifications</p>
        <div className="flex flex-col divide-y divide-border px-4 md:px-0">
          {[
            { label: 'New Order', sub: 'Alert when a new order is placed', checked: notifyOrder, toggle: setNotifyOrder },
            { label: 'Low Stock Alert', sub: 'When a product drops below 5 units', checked: notifyStock, toggle: setNotifyStock },
            { label: 'New Review', sub: 'Alert when a customer leaves a review', checked: notifyReview, toggle: setNotifyReview },
          ].map((item) => (
            <button key={item.label} type="button" onClick={() => item.toggle(!item.checked)} className="flex items-center justify-between py-4 text-left">
              <div>
                <p className="text-md font-semibold text-fg">{item.label}</p>
                <p className="text-xs text-muted-warm">{item.sub}</p>
              </div>
              <div className={`flex h-[26px] w-12 shrink-0 items-center rounded-full px-[2px] transition-colors ${item.checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'}`}>
                <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${item.checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
              </div>
            </button>
          ))}
        </div>

        {/* Danger Zone */}
        <p className="border-b border-danger/30 px-4 pt-[14px] pb-2 text-xs font-bold uppercase tracking-wide text-danger md:px-0">Danger Zone</p>
        <div className="px-4 py-4 md:px-0">
          <button type="button" className="w-full rounded-lg border border-danger py-3 text-md font-semibold text-danger transition-colors active:bg-danger/5">
            Delete Store
          </button>
        </div>
      </form>
    </div>
  )
}
