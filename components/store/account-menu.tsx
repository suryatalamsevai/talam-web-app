'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { StoreLink, useStoreBase } from '@/components/store/store-context'
import { createBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

function displayUser(user: User) {
  const name = user.user_metadata?.full_name ?? user.phone ?? user.email ?? 'Account'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  return { name, phone: user.phone ?? '', initial: name.charAt(0).toUpperCase() || '?', avatarUrl }
}

export function AccountMenu({ ownerId }: { ownerId: string }) {
  const [open, setOpen] = useState(false)
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const storeBase = useStoreBase()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setAuthUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setAuthUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push(`${storeBase}/auth`)
    router.refresh()
  }

  const user = authUser ? displayUser(authUser) : null
  const isAdmin = authUser?.id === ownerId

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-border-light sm:size-10"
      >
        {user ? (
          <span className="flex size-9 items-center justify-center overflow-hidden rounded-lg bg-store-primary/15 font-body text-xs font-bold text-store-primary sm:size-10">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              user.initial
            )}
          </span>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="#8B7D7A" strokeWidth="2" />
            <circle cx="12" cy="7" r="4" stroke="#8B7D7A" strokeWidth="2" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[220px] rounded-xl border border-border bg-surface py-2 shadow-lg">
          {user ? (
            <>
              <div className="px-4 py-3 border-b border-border-light">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-store-primary/15 font-body text-xs font-bold text-store-primary">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      user.initial
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-body text-sm font-semibold text-fg">
                      {user.name}
                      {isAdmin && (
                        <span className="rounded-full bg-store-primary/15 px-2 py-0.5 font-body text-2xs font-bold uppercase tracking-[0.04em] text-store-primary">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="font-body text-xs text-muted-warm">{user.phone}</div>
                  </div>
                </div>
              </div>
              <StoreLink href="/account/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-fg hover:bg-bg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                Profile
              </StoreLink>
              <StoreLink href="/orders" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-fg hover:bg-bg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" /><rect x="9" y="3" width="6" height="4" rx="1" /></svg>
                Orders
              </StoreLink>
              <StoreLink href="/account" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-fg hover:bg-bg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Settings
              </StoreLink>
              <div className="mx-3 my-1 border-t border-border-light" />
              <button type="button" onClick={handleSignOut} className="flex w-full items-center gap-3 px-4 py-2.5 font-body text-sm text-danger hover:bg-bg">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                Log Out
              </button>
            </>
          ) : (
            <StoreLink href="/auth" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2.5 font-body text-sm text-fg hover:bg-bg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10,17 15,12 10,7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
              Log in / Sign up
            </StoreLink>
          )}
        </div>
      )}
    </div>
  )
}
