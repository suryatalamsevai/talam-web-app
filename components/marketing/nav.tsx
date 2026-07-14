'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-[60px] py-4 transition-all duration-300',
        scrolled
          ? 'bg-bg-dark/80 backdrop-blur-md border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <Logo className="text-white text-[22px]" />
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Features
        </a>
        <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Pricing
        </a>
        <a href="#faq" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          FAQ
        </a>
        <Link
          href="/auth"
          className="text-sm text-white/70 hover:text-white transition-colors font-body"
        >
          Sign in
        </Link>
        <Link
          href="/auth"
          className="px-5 py-[9px] rounded-full bg-brand-primary text-white text-sm font-semibold font-body hover:opacity-90 transition-opacity"
        >
          Start free
        </Link>
      </div>
      <Link
        href="/auth"
        className="md:hidden px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold font-body"
      >
        Start free
      </Link>
    </nav>
  )
}
