import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import { getTenantStorefront } from '@/lib/data/tenant'
import { getStoreBanners } from '@/lib/data/storefront'
import { STORE_THEMES } from '@/lib/store-themes'

// Mobile counterpart of app/store/layout.tsx's and app/store/page.tsx's direct
// getTenantStorefront()/getStoreBanners() calls — currently RSC-only, with no Server
// Action layer to wrap, so this reuses those lib/data functions directly and shapes
// the storefront config (name/logo/theme/contact/policy) plus the hero banner carousel
// those pages already read for the client.
export async function GET(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  const [storefront, banners] = await Promise.all([
    getTenantStorefront(tenant.id),
    getStoreBanners(tenant.id),
  ])
  if (!storefront) return apiError('not_found', 'Store not found')

  return apiSuccess({
    name: storefront.name,
    tagline: storefront.tagline,
    logoUrl: storefront.logoUrl,
    theme: {
      color: storefront.brandColor,
      presets: STORE_THEMES,
    },
    whatsappNumber: storefront.whatsappNumber,
    showWhatsappButton: storefront.showWhatsappButton,
    contactPhone: storefront.contactPhone,
    contactEmail: storefront.contactEmail,
    policy: {
      freeDeliveryAbove: storefront.freeDeliveryAbove,
      shippingFee: storefront.shippingFee,
      deliveryEstimateText: storefront.deliveryEstimateText,
      returnWindowDays: storefront.returnWindowDays,
      trustBadgeText: storefront.trustBadgeText,
      sizeGuideUrl: storefront.sizeGuideUrl,
    },
    about: storefront.about,
    branch: storefront.branch,
    banners: banners
      .filter((b) => b.product)
      .map((b) => {
        const p = b.product!
        const reviews = p.reviews || []
        const averageRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
        return {
          headline: b.headline || p.name,
          subtitle: b.subtitle || p.category?.name || '',
          slug: p.slug,
          price: Number(p.price),
          comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
          sizes: p.sizes,
          images: p.images,
          reviewCount: reviews.length,
          averageRating,
        }
      }),
  })
}
