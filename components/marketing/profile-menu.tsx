'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'

const DEFAULT_TRIGGER_CLASS =
  'flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-white/10 text-white text-sm font-semibold hover:opacity-80 transition-opacity'

export function ProfileMenu({ user, triggerClassName }: { user: User; triggerClassName?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    setOpen(false)
    router.push('/')
    router.refresh()
  }

  const name = user.user_metadata.full_name ?? user.email ?? ''
  const avatarUrl = user.user_metadata.avatar_url as string | undefined
  const initial = name.charAt(0).toUpperCase() || '?'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <>{initial}</>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[200px] rounded-xl border border-white/10 bg-bg-dark py-2 shadow-lg">
          <Link
            href="/welcome"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 font-body text-sm text-white/80 hover:bg-white/5 hover:text-white"
          >
            Go to Home Page
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="block w-full px-4 py-2.5 text-left font-body text-sm text-white/80 hover:bg-white/5 hover:text-white"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  )
}
