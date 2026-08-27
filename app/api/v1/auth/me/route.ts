import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth-guard'

// First `app/api/v1/**` route: proves out the bearer-token auth path end-to-end for
// mobile clients ahead of the versioned response envelope (queue Phase 0 task 3), which
// isn't built yet — so this returns a plain, ad-hoc JSON shape rather than a shared one.
export async function GET(request: Request) {
  const tenantId = request.headers.get('x-tenant-id')
  if (!tenantId) {
    return NextResponse.json({ error: 'missing_tenant' }, { status: 400 })
  }

  const user = await requireApiUser(request, tenantId)
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    tenantId,
  })
}
