'use server'

import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import type { PaymentId } from './onboarding-data'

type ActionResult = { error?: string }

function isSlugCollision(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') return false

  // With the query engine, the offending fields are at err.meta.target.
  if (Array.isArray(err.meta?.target) && (err.meta.target as string[]).includes('slug')) return true

  // With the @prisma/adapter-pg driver adapter, meta.target is absent — the fields
  // are nested under meta.driverAdapterError.cause.constraint.fields instead.
  const adapterFields = (
    err.meta?.driverAdapterError as { cause?: { constraint?: { fields?: unknown } } } | undefined
  )?.cause?.constraint?.fields
  return Array.isArray(adapterFields) && adapterFields.includes('slug')
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'product'
  )
}

export async function saveStoreStep(input: { storeName: string; slug: string; category: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  try {
    await prisma.tenant.upsert({
      where: { ownerId: userId },
      create: { ownerId: userId, name: input.storeName, slug: input.slug, storeType: input.category, onboardingStep: 1 },
      update: { name: input.storeName, slug: input.slug, storeType: input.category, onboardingStep: 1 },
    })
    return {}
  } catch (err) {
    if (isSlugCollision(err)) return { error: 'That store URL is taken — try another.' }
    throw err
  }
}

export async function saveBrandStep(input: { brandColor: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { brandColor: input.brandColor, onboardingStep: 2 },
  })
  return {}
}

export async function saveContactStep(input: {
  contactPhone: string
  contactEmail: string
  branchName: string
  branchAddress: string
  branchCity: string
}): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { contactPhone: input.contactPhone, contactEmail: input.contactEmail, onboardingStep: 3 },
    select: { id: true },
  })

  const existingBranch = await prisma.storeBranch.findFirst({ where: { tenantId: tenant.id }, select: { id: true } })
  const branchData = { name: input.branchName, address: input.branchAddress, city: input.branchCity }

  if (existingBranch) {
    await prisma.storeBranch.update({ where: { id: existingBranch.id }, data: branchData })
  } else {
    await prisma.storeBranch.create({ data: { ...branchData, tenantId: tenant.id } })
  }

  return {}
}

export async function saveStoryStep(input: { tagline: string; aboutDescription: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { tagline: input.tagline, onboardingStep: 4 },
    select: { id: true },
  })

  await prisma.storeAbout.upsert({
    where: { tenantId: tenant.id },
    create: { tenantId: tenant.id, description: input.aboutDescription },
    update: { description: input.aboutDescription },
  })

  return {}
}

export async function saveProductStep(input: { productName: string; productPrice: string; productStock: string }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { onboardingStep: 5 },
    select: { id: true },
  })

  const existingProduct = await prisma.product.findFirst({
    where: { tenantId: tenant.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  const productData = {
    name: input.productName,
    slug: slugify(input.productName),
    price: Number(input.productPrice),
    sizes: ['Free Size'],
    stockBySize: { 'Free Size': Number(input.productStock) },
  }

  if (existingProduct) {
    await prisma.product.update({ where: { id: existingProduct.id }, data: productData })
  } else {
    await prisma.product.create({ data: { ...productData, tenantId: tenant.id } })
  }

  return {}
}

const PAYMENT_PROVIDER_MAP: Record<PaymentId, 'upi_manual' | 'razorpay' | 'instamojo'> = {
  upi: 'upi_manual',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export async function savePaymentStep(input: { paymentId: PaymentId }): Promise<ActionResult> {
  const { userId } = await requireOwnerSession()
  await prisma.tenant.update({
    where: { ownerId: userId },
    data: { paymentProvider: PAYMENT_PROVIDER_MAP[input.paymentId], onboardingStep: 6 },
  })
  return {}
}

async function seedStarterContent(tenantId: string): Promise<void> {
  const [categoryCount, bannerCount, promotionCount, tagCount] = await Promise.all([
    prisma.productCategory.count({ where: { tenantId } }),
    prisma.storeBanner.count({ where: { tenantId } }),
    prisma.storePromotion.count({ where: { tenantId } }),
    prisma.productTag.count({ where: { tenantId } }),
  ])

  if (categoryCount === 0) {
    await prisma.productCategory.createMany({
      data: [1, 2, 3].map((n) => ({ tenantId, name: `Sample Category ${n}`, slug: `sample-category-${n}`, sortOrder: n })),
    })
  }

  if (tagCount === 0) {
    await prisma.productTag.createMany({
      data: [
        { tenantId, name: 'Diwali', slug: 'diwali', emoji: '🪔', isDefault: true, themeKey: 'diwali', sortOrder: 0 },
        { tenantId, name: 'Pongal', slug: 'pongal', emoji: '🌾', isDefault: true, themeKey: 'pongal', sortOrder: 1 },
      ],
    })
  }

  if (bannerCount === 0) {
    const firstProduct = await prisma.product.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' }, select: { id: true } })
    if (firstProduct) {
      await prisma.storeBanner.create({
        data: { tenantId, productId: firstProduct.id, headline: 'Sample Hero Banner — edit in Settings', sortOrder: 0 },
      })
    }
  }

  if (promotionCount === 0) {
    await prisma.storePromotion.create({
      data: { tenantId, offerText: 'Sample Offer — edit in Settings', subtitle: null, sortOrder: 0 },
    })
  }
}

export async function completeOnboarding(): Promise<ActionResult & { storeUrl?: string }> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { isOnboarded: true, onboardingStep: 7 },
    select: { id: true, slug: true },
  })

  await seedStarterContent(tenant.id)

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
  const storeUrl = isLocalDev ? `/dev/store/${tenant.slug}` : `https://${tenant.slug}.${rootDomain}`

  return { storeUrl }
}
