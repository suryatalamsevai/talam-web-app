import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantStorefront, getRequestTenantId } from '@/lib/data/tenant'
import { getCategories } from '@/lib/data/products'
import { StoreBaseProvider } from '@/components/store/store-context'
import { StoreHeader } from '@/components/store/store-header'
import { StoreFooter } from '@/components/store/store-footer'
import { MobileTabBar } from '@/components/store/mobile-tab-bar'
import { CartToast } from '@/components/store/cart-toast'
import { TapFeedback } from '@/components/store/tap-feedback'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const tenantId = await getRequestTenantId()

  if (!tenantId) notFound()

  const [tenant, categories, hdrs] = await Promise.all([
    getTenantStorefront(tenantId),
    getCategories(tenantId),
    headers(),
  ])

  if (!tenant) notFound()

  const storeBase = hdrs.get('x-store-base') ?? ''

  return (
    <StoreBaseProvider base={storeBase}>
      <StoreHeader tenant={tenant} />
      <div className="pb-20 sm:pb-0">
        {children}
        <StoreFooter tenant={tenant} categories={categories} />
      </div>
      <MobileTabBar />
      <CartToast />
      <TapFeedback />
    </StoreBaseProvider>
  )
}
