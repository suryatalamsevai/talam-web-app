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

export type ContactSettings = { contactPhone: string; contactEmail: string; address: string; city: string }

export async function getContactSettingsAction(): Promise<ContactSettings> {
  const { tenantId } = await requireOwnerTenant()
  const [tenant, branch] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.tenant.findUnique({ where: { id: tenantId }, select: { contactPhone: true, contactEmail: true, name: true } }),
      db.storeBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { address: true, city: true } }),
    ])
  )
  return {
    contactPhone: tenant?.contactPhone ?? '',
    contactEmail: tenant?.contactEmail ?? '',
    address: branch?.address ?? '',
    city: branch?.city ?? '',
  }
}

export async function updateContactSettingsAction(input: ContactSettings): Promise<void> {
  const { tenantId } = await requireOwnerTenant()

  await withTenant(tenantId, async (db) => {
    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: { contactPhone: input.contactPhone, contactEmail: input.contactEmail },
      select: { name: true },
    })

    const existingBranch = await db.storeBranch.findFirst({ where: { tenantId }, orderBy: { sortOrder: 'asc' }, select: { id: true } })
    if (existingBranch) {
      await db.storeBranch.update({ where: { id: existingBranch.id }, data: { address: input.address, city: input.city } })
    } else {
      await db.storeBranch.create({ data: { tenantId, name: tenant.name, address: input.address, city: input.city } })
    }
  })

  revalidatePath('/admin/settings')
  revalidatePath('/admin/dashboard')
}
