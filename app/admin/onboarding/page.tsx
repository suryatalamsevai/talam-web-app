import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { OnboardingWizard } from './onboarding-wizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await requireOwnerSession()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: {
      about: { select: { description: true } },
      branches: { orderBy: { sortOrder: 'asc' }, take: 1 },
      products: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  if (tenant?.isOnboarded) {
    const host = (await headers()).get('host')
    const isLocalDev = host?.includes('localhost') ?? false
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'
    redirect(isLocalDev ? `/dev/store/${tenant.slug}` : `https://${tenant.slug}.${rootDomain}`)
  }

  return (
    <OnboardingWizard
      initialTenant={tenant}
      initialBranch={tenant?.branches[0] ?? null}
      initialProduct={tenant?.products[0] ?? null}
    />
  )
}
