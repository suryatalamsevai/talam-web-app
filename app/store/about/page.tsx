import { mockGetTenantStorefront, mockGetBranches } from '@/lib/mock-data'
import { AboutHero } from '@/components/store/about-hero'
import { VisitUs } from '@/components/store/visit-us'

export default async function AboutPage() {
  const tenant = mockGetTenantStorefront()
  const branches = mockGetBranches()

  return (
    <main className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-16 sm:py-12">
      <AboutHero tenant={tenant} />
      <VisitUs branches={branches} />
    </main>
  )
}
