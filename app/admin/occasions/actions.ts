'use server'

import { Prisma } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOccasions, listActiveProductsForPicker, listProductsForOccasionPicker, updateOccasionSettings } from '@/lib/data/occasions'

type ActionResult = { error?: string }

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'occasion'
  )
}

function isSlugCollision(err: unknown): boolean {
  return (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === 'P2002' &&
    Array.isArray(err.meta?.target) &&
    (err.meta.target as string[]).includes('slug')
  )
}

export async function getOccasions() {
  const { tenantId } = await requireOwnerTenant()
  return listOccasions(tenantId)
}

export async function getOccasionProductPicker(occasionId: string) {
  const { tenantId } = await requireOwnerTenant()
  return listProductsForOccasionPicker(tenantId, occasionId)
}

export async function getNewOccasionProductPicker() {
  const { tenantId } = await requireOwnerTenant()
  return listActiveProductsForPicker(tenantId)
}

// Creates an occasion with its theme, layout, and products all in one step.
export async function createOccasionAction(input: {
  name: string
  emoji?: string
  themeKey: string
  layout: 'grid' | 'carousel'
  productIds: string[]
}): Promise<ActionResult> {
  if (input.productIds.length === 0) return { error: 'Select at least one product.' }

  const { tenantId } = await requireOwnerTenant()
  try {
    const occasion = await withTenant(tenantId, (db) =>
      db.productTag.create({
        data: {
          tenantId,
          name: input.name,
          slug: slugify(input.name),
          emoji: input.emoji || null,
          themeKey: input.themeKey,
          layout: input.layout,
          status: 'draft',
        },
      })
    )
    await withTenant(tenantId, (db) =>
      db.productTagAssignment.createMany({
        data: input.productIds.map((productId, index) => ({ tenantId, tagId: occasion.id, productId, sortOrder: index })),
      })
    )
    return {}
  } catch (err) {
    if (isSlugCollision(err)) return { error: 'An occasion with that name already exists.' }
    throw err
  }
}

export async function deleteOccasion(occasionId: string): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { isDefault: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }
  if (occasion.isDefault) return { error: 'Default occasions cannot be deleted.' }

  await withTenant(tenantId, (db) =>
    db.$transaction([
      db.productTagAssignment.deleteMany({ where: { tenantId, tagId: occasionId } }),
      db.productTag.delete({ where: { id: occasionId } }),
    ])
  )
  return {}
}

// Replaces the full set of products assigned to an occasion with the given list.
// Array order is saved as each assignment's sortOrder — drives display order on the storefront.
export async function setOccasionProducts(occasionId: string, productIds: string[]): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await withTenant(tenantId, (db) =>
    db.$transaction([
      db.productTagAssignment.deleteMany({ where: { tenantId, tagId: occasionId } }),
      ...(productIds.length
        ? [
            db.productTagAssignment.createMany({
              data: productIds.map((productId, index) => ({ tenantId, tagId: occasionId, productId, sortOrder: index })),
            }),
          ]
        : []),
      db.productTag.update({ where: { id: occasionId, tenantId }, data: { status: 'draft' } }),
    ])
  )
  return {}
}

export async function setOccasionSettings(
  occasionId: string,
  input: { themeKey?: string; layout?: 'grid' | 'carousel' }
): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await updateOccasionSettings(tenantId, occasionId, input)
  return {}
}

// On/off toggle — sets published/draft directly for this one occasion, independent of the
// tenant-wide "Publish changes" batch used elsewhere for pending content edits.
export async function setOccasionStatusAction(occasionId: string, enabled: boolean): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { _count: { select: { products: true } } } })
  )
  if (!occasion) return { error: 'Occasion not found.' }
  if (enabled && occasion._count.products === 0) return { error: 'Add a product before turning this on.' }

  await withTenant(tenantId, (db) =>
    db.productTag.update({ where: { id: occasionId, tenantId }, data: { status: enabled ? 'published' : 'draft' } })
  )
  return {}
}
