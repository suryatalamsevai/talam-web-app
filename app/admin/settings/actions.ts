'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import type { SocialLink } from '@/lib/data/tenant'

export async function getAboutAction(): Promise<{ description: string; socialLinks: SocialLink[] }> {
  const { tenantId } = await requireOwnerTenant()
  const about = await withTenant(tenantId, (db) =>
    db.storeAbout.findUnique({ where: { tenantId }, select: { description: true, socialLinks: true } })
  )
  return {
    description: about?.description ?? '',
    socialLinks: (about?.socialLinks as SocialLink[] | undefined) ?? [],
  }
}

export async function updateAboutAction(input: { description: string; socialLinks: SocialLink[] }) {
  const { tenantId } = await requireOwnerTenant()
  const socialLinks = input.socialLinks.filter((l) => l.platform.trim() && l.url.trim())

  await withTenant(tenantId, (db) =>
    db.storeAbout.upsert({
      where: { tenantId },
      create: { tenantId, description: input.description, socialLinks, status: 'draft' },
      update: { description: input.description, socialLinks, status: 'draft' },
    })
  )
  revalidatePath('/admin/settings')
}
