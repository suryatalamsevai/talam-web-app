'use server'

import { headers } from 'next/headers'
import { Prisma } from '@prisma/client'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import type { PaymentId } from './onboarding-data'

type ActionResult = { error?: string }

function isSlugCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('slug')
  )
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

export async function completeOnboarding(): Promise<ActionResult & { storeUrl?: string }> {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.update({
    where: { ownerId: userId },
    data: { isOnboarded: true, onboardingStep: 7 },
    select: { slug: true },
  })

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
  const storeUrl = isLocalDev ? `/dev/store/${tenant.slug}` : `https://${tenant.slug}.${rootDomain}`

  return { storeUrl }
}
