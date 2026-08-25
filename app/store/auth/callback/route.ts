import { createServerClient } from '@/lib/supabase/server'
import { syncStoreCustomer } from '@/lib/auth/sync-store-customer'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'
import { isSafeRedirectTarget } from '@/lib/tenant-url'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const rawNext = searchParams.get('next')
  const next = isSafeRedirectTarget(rawNext, origin) ? rawNext : null

  const headersList = await headers()
  const storeBase = headersList.get('x-store-base') ?? ''
  const tenantId = headersList.get('x-tenant-id')

  if (code && tenantId) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const user = data.user
      const customer = await syncStoreCustomer(tenantId, user)

      const defaultDest = customer.onboardingComplete
        ? `${storeBase}/account/profile`
        : `${storeBase}/onboarding`
      return NextResponse.redirect(`${origin}${next ?? defaultDest}`)
    }
  }

  return NextResponse.redirect(`${origin}${storeBase}/auth?error=oauth_failed`)
}
