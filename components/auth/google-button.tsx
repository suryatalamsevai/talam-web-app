'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { GoogleIcon } from '@/components/icons/google-icon'

export function GoogleButton({ redirectPath = '/auth/callback', next }: { redirectPath?: string; next?: string }) {
  const supabase = createBrowserClient()
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    const redirectTo = new URL(redirectPath, window.location.origin)
    if (next) redirectTo.searchParams.set('next', next)

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo.toString(),
      },
    })
    if (error) setLoading(false)
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={loading}
      className="w-full h-auto rounded-[8px] border-[1.5px] border-border p-[13px] gap-[10px] font-body font-medium text-fg text-md disabled:opacity-70"
      onClick={handleGoogleSignIn}
    >
      {loading ? <Loader2 className="size-[18px] animate-spin" /> : <GoogleIcon />}
      {loading ? 'Redirecting…' : 'Continue with Google'}
    </Button>
  )
}
