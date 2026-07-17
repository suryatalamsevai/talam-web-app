import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (!code) {
    return NextResponse.redirect(new URL('/auth?error=oauth_cancelled', request.url))
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(new URL('/auth?error=oauth_failed', request.url))
  }

  const user = data.user
  await prisma.user.upsert({
    where: { id: user.id },
    create: {
      id: user.id,
      email: user.email,
      name: user.user_metadata.full_name ?? null,
      avatarUrl: user.user_metadata.avatar_url ?? null,
    },
    update: {
      email: user.email,
      name: user.user_metadata.full_name ?? null,
      avatarUrl: user.user_metadata.avatar_url ?? null,
    },
  })

  return NextResponse.redirect(new URL(next, request.url))
}
