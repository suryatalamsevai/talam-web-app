'use client'

import { useEffect, useRef, useState } from 'react'

/** Shared animated dialog shell — fades in + slides up on open, matching the pattern already used by order-details-modal / product editor. */
export function Dialog({
  open,
  onClose,
  children,
  className = '',
  position = 'bottom',
}: {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  /** 'bottom' (default) slides up from the bottom on mobile; 'center' stays centered on all screens. */
  position?: 'bottom' | 'center'
}) {
  const [visible, setVisible] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else queueMicrotask(() => setVisible(false))
  }, [open])

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement | null
    panelRef.current?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  const centered = position === 'center'

  return (
    <div
      className={`fixed inset-0 z-50 flex ${centered ? 'items-center justify-center p-4' : 'items-end md:items-center md:justify-center'} bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`flex w-full flex-col bg-surface transition-transform duration-250 ease-out md:max-w-[480px] ${
          centered ? 'rounded-2xl' : 'rounded-t-2xl md:rounded-2xl'
        } ${
          visible
            ? 'translate-y-0 md:scale-100'
            : centered
              ? 'scale-95'
              : 'translate-y-full md:translate-y-0 md:scale-95'
        } ${className}`}
      >
        {children}
      </div>
    </div>
  )
}
