'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { useOwnerCta } from './use-owner-cta'
import { ProfileMenu } from './profile-menu'

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const cta = useOwnerCta()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
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
        {user ? (
          <ProfileMenu user={user} />
        ) : user === null ? (
          <>
            <Link
              href="/auth"
              className="text-sm text-white/70 hover:text-white transition-colors font-body"
            >
              Sign in
            </Link>
            <Link
              href={cta?.href ?? '/auth'}
              className="px-5 py-[9px] rounded-full bg-brand-primary text-white text-sm font-semibold font-body hover:opacity-90 transition-opacity"
            >
              {cta?.label ?? 'Start free'}
            </Link>
          </>
        ) : null}
      </div>
      {user === null && (
        <Link
          href={cta?.href ?? '/auth'}
          className="md:hidden px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold font-body"
        >
          {cta?.label ?? 'Start free'}
        </Link>
      )}
      {user && (
        <ProfileMenu
          user={user}
          triggerClassName="md:hidden flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-white/10 text-white text-sm font-semibold"
        />
      )}
    </nav>
  )
}
