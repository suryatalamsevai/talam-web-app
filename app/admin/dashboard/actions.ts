'use server'

import { headers } from 'next/headers'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getStoreUrl } from '@/lib/tenant-url'

export async function getLiveStoreUrl(): Promise<string | null> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUnique({ where: { ownerId: userId }, select: { slug: true } })
  if (!tenant) return null

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  return getStoreUrl(tenant.slug, isLocalDev)
}
