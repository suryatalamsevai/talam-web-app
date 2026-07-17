'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<User | null | undefined>(undefined)

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

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
  }

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
          <AccountMenu user={user} onSignOut={handleSignOut} />
        ) : user === null ? (
          <>
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
          </>
        ) : null}
      </div>
      {user === null && (
        <Link
          href="/auth"
          className="md:hidden px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold font-body"
        >
          Start free
        </Link>
      )}
    </nav>
  )
}

function AccountMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const name = user.user_metadata.full_name ?? user.email ?? ''
  const avatarUrl = user.user_metadata.avatar_url as string | undefined
  const initial = name.charAt(0).toUpperCase() || '?'

  return (
    <details className="relative">
      <summary className="list-none cursor-pointer flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-white/10 text-white text-sm font-semibold">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          initial
        )}
      </summary>
      <div className="absolute right-0 mt-2 w-56 rounded-lg bg-bg-dark border border-white/10 shadow-lg p-3 flex flex-col gap-2">
        <p className="text-sm text-white font-body truncate">{name}</p>
        {user.email && <p className="text-xs text-white/50 font-body truncate">{user.email}</p>}
        <button
          type="button"
          onClick={onSignOut}
          className="mt-1 text-sm text-left text-white/70 hover:text-white transition-colors font-body"
        >
          Sign out
        </button>
      </div>
    </details>
  )
}
