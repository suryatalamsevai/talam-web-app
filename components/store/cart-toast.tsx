'use client'

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { StoreLink } from '@/components/store/store-context'

type ToastData = { name: string; size?: string }

let listeners: Array<(data: ToastData) => void> = []

export function showCartToast(data: ToastData) {
  listeners.forEach(fn => fn(data))
}

export function CartToast() {
  const [toast, setToast] = useState<ToastData | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handler = (data: ToastData) => {
      setToast(data)
      setVisible(true)
      setTimeout(() => setVisible(false), 3000)
    }
    listeners.push(handler)
    return () => { listeners = listeners.filter(fn => fn !== handler) }
  }, [])

  if (!toast) return null

  return (
    <div
      className={`fixed bottom-20 left-3 right-3 z-50 mx-auto max-w-md transition-all duration-300 sm:bottom-6 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 shadow-lg sm:gap-3 sm:px-4 sm:py-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success sm:h-6 sm:w-6">
          <Check className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" />
        </span>
        <p className="min-w-0 flex-1 truncate font-body text-xs text-fg sm:text-sm">
          <span className="font-semibold">{toast.name}</span>
          {toast.size ? ` (${toast.size})` : ''} added
        </p>
        <StoreLink
          href="/cart"
          className="shrink-0 rounded-lg bg-store-primary px-2.5 py-1.5 font-body text-[11px] font-semibold text-surface hover:opacity-90 sm:px-3 sm:text-xs"
        >
          View Cart
        </StoreLink>
      </div>
    </div>
  )
}
