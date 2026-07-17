import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { headers } from 'next/headers'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  const headersList = await headers()
  const storeBase = headersList.get('x-store-base') ?? ''
  const tenantId = headersList.get('x-tenant-id')

  if (code && tenantId) {
    const supabase = await createServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const user = data.user
      await prisma.customer.upsert({
        where: { id: user.id },
        create: {
          id: user.id,
          tenantId,
          name: user.user_metadata?.full_name ?? null,
          email: user.email ?? null,
          phone: user.phone ?? null,
        },
        update: {
          name: user.user_metadata?.full_name ?? null,
          email: user.email ?? null,
          phone: user.phone ?? null,
        },
      })

      return NextResponse.redirect(`${origin}${next ?? `${storeBase}/account/profile`}`)
    }
  }

  return NextResponse.redirect(`${origin}${storeBase}/auth?error=oauth_failed`)
}
