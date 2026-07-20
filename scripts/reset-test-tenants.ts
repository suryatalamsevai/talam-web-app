import 'dotenv/config'
import { prisma } from '../lib/prisma'

// Deletes a tenant's owned data (in FK-safe order) so its owner can go through
// onboarding fresh. Does NOT touch the Supabase auth user or the User row —
// only the Tenant and everything that hangs off it. Categories are tenant-owned
// (ProductCategory has no global table), so they're recreated automatically by
// the existing onboarding/seed logic once the owner re-onboards — nothing to
// preserve here beyond leaving that seeding code alone.
async function resetTenantByEmail(email: string): Promise<void> {
  const user = await prisma.user.findFirst({ where: { email }, select: { id: true, email: true } })
  if (!user) {
    console.log(`skip ${email}: no User row (never logged in) — nothing to reset`)
    return
  }

  const tenant = await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { id: true, slug: true } })
  if (!tenant) {
    console.log(`skip ${email}: no Tenant owned by this user — already clean`)
    return
  }

  const tenantId = tenant.id

  await prisma.$transaction([
    prisma.reviewReport.deleteMany({ where: { tenantId } }),
    prisma.productTagAssignment.deleteMany({ where: { tenantId } }),
    prisma.storePromotionProduct.deleteMany({ where: { tenantId } }),
    prisma.orderItem.deleteMany({ where: { tenantId } }),
    prisma.productReview.deleteMany({ where: { tenantId } }),
    prisma.wishlist.deleteMany({ where: { tenantId } }),
    prisma.order.deleteMany({ where: { tenantId } }),
    prisma.address.deleteMany({ where: { tenantId } }),
    prisma.storeBanner.deleteMany({ where: { tenantId } }),
    prisma.storePromotion.deleteMany({ where: { tenantId } }),
    prisma.productTag.deleteMany({ where: { tenantId } }),
    prisma.product.deleteMany({ where: { tenantId } }),
    prisma.productCategory.deleteMany({ where: { tenantId } }),
    prisma.customer.deleteMany({ where: { tenantId } }),
    prisma.discountCode.deleteMany({ where: { tenantId } }),
    prisma.storeAbout.deleteMany({ where: { tenantId } }),
    prisma.storeBranch.deleteMany({ where: { tenantId } }),
    prisma.publishLog.deleteMany({ where: { tenantId } }),
    prisma.tenant.delete({ where: { id: tenantId } }),
  ])

  console.log(`reset ${email}: deleted tenant "${tenant.slug}" (${tenantId}) and all its data`)
}

async function main() {
  const emails = process.argv.slice(2)
  if (emails.length === 0) {
    console.error('Usage: npx tsx scripts/reset-test-tenants.ts <email> [email...]')
    process.exit(1)
  }

  for (const email of emails) {
    await resetTenantByEmail(email)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
