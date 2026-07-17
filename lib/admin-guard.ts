import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function requireOwnerSession(nextPath = '/admin/onboarding'): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?next=${nextPath}`)
  }

  return { userId: user.id }
}

// Admin Server Actions operate on the signed-in owner's own tenant, never a client-supplied id.
export async function requireOwnerTenant(): Promise<{ userId: string; tenantId: string }> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUnique({ where: { ownerId: userId }, select: { id: true } })
  if (!tenant) redirect('/admin/onboarding')
  return { userId, tenantId: tenant.id }
}
