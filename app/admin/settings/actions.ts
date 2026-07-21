'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { createLinkedAccount, getLinkedAccount } from '@/lib/razorpay'
import type { RazorpayPaymentConfig, SocialLink } from '@/lib/data/tenant'

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

export async function getPaymentSettingsAction(): Promise<{ provider: string; razorpay: RazorpayPaymentConfig | null }> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentProvider: true, paymentConfig: true } })
  )
  return { provider: tenant?.paymentProvider ?? 'upi_manual', razorpay: (tenant?.paymentConfig as RazorpayPaymentConfig | null) ?? null }
}

export async function startRazorpayOnboardingAction(): Promise<{ onboardingUrl: string } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, contactEmail: true, contactPhone: true } })
  )
  if (!tenant?.contactEmail?.trim() || !tenant?.contactPhone?.trim()) {
    return { error: 'Add a contact phone and email before connecting Razorpay.' }
  }

  const account = await createLinkedAccount({ email: tenant.contactEmail, phone: tenant.contactPhone, businessName: tenant.name })

  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: account.id,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  }
  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { paymentProvider: 'razorpay', paymentConfig } }))

  revalidatePath('/admin/settings')
  return { onboardingUrl: `https://dashboard.razorpay.com/onboarding/${account.id}` }
}

export async function refreshRazorpayStatusAction(): Promise<{ status: RazorpayPaymentConfig['status'] } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) => db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } }))
  const existing = tenant?.paymentConfig as RazorpayPaymentConfig | null
  if (!existing?.accountId) return { error: 'No Razorpay account connected yet.' }

  const account = await getLinkedAccount(existing.accountId)
  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: existing.accountId,
    status: account.status as RazorpayPaymentConfig['status'],
    updatedAt: new Date().toISOString(),
  }
  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { paymentConfig } }))

  revalidatePath('/admin/settings')
  return { status: paymentConfig.status }
}
