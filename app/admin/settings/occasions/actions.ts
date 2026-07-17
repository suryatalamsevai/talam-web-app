'use server'

import { Prisma } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOccasions, listProductsForOccasionPicker } from '@/lib/data/occasions'

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

export async function createOccasion(input: { name: string; emoji?: string }): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  try {
    await withTenant(tenantId, (db) =>
      db.productTag.create({
        data: { tenantId, name: input.name, slug: slugify(input.name), emoji: input.emoji || null },
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
              data: productIds.map((productId) => ({ tenantId, tagId: occasionId, productId })),
            }),
          ]
        : []),
    ])
  )
  return {}
}
