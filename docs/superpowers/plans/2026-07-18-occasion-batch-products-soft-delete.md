# Occasion/Batch-Products/Soft-Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strip product-picking out of the `/admin/occasions` add/edit modal (which another concurrent session just shipped requiring ≥1 product), and instead let owners assign products to occasions from a new batch-selection system on `/admin/products` — alongside bulk category/status edit, soft delete, and "reset to default" (clears occasion + offer associations).

**Architecture:** Adapt the existing `/admin/occasions` page in place (it already has a compact card grid — no card-layout work needed) by removing its product-picker section and product-count gating. Add a new selection layer to `AdminProductsClient`: a `Set<string>` of selected product IDs, a small extensible `BatchAction[]` registry (`app/admin/products/batch-actions.ts`), and one dedicated server action per batch operation (never N sequential per-row calls). Soft delete is a new nullable `deletedAt` column on `Product`, filtered out everywhere products are read for customers/admin lists, mirroring the existing `Tenant.deletedAt` pattern.

**Tech Stack:** Next.js App Router Server Actions, Prisma 7.8 (via `withTenant`), Vitest for data/action-layer tests.

## Global Constraints

- Bulk edit touches **only** `categoryId` or `isActive` — never `name`/`price`/`images`/`description` in bulk (explicit user decision).
- "Status" in this feature means the existing `isActive` boolean (Active/Inactive) — **not** the unrelated `PublishStatus` (draft/published) field another session added. Do not touch `PublishStatus` anywhere in this plan.
- CSV import is explicitly out of scope for this plan (deferred to its own future spec — see design doc §12).
- This repo has another active session committing directly to `main`. **Before editing any file listed below, re-read its current on-disk content first** — do not assume the snippets in this plan are still byte-exact; they were correct as of 2026-07-18 but the other session may have touched shared files (`lib/data/occasions.ts`, `app/admin/occasions/*`, `prisma/schema.prisma`) again since. If a file's current content differs meaningfully from what a step expects, stop and adapt the edit to the real current content rather than blindly applying the diff.
- Run `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx tsc --noEmit` after each task and expect it clean before moving on.

---

## Part A — Strip product-requirement out of the Occasions modal

### Task 1: Data layer — drop dead pickers, add additive batch-assign, allow renaming

**Files:**
- Modify: `lib/data/occasions.ts`
- Test: `lib/data/occasions.test.ts` (new)

**Interfaces:**
- Produces: `assignProductsToOccasion(tenantId: string, occasionId: string, productIds: string[]): Promise<void>` — additive, skips already-assigned products, appends at the end of that occasion's `sortOrder`.
- Produces: `updateOccasionSettings(tenantId: string, occasionId: string, input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }): Promise<ProductTag>` — now also accepts `name`.
- Removes: `listProductsForOccasionPicker`, `listActiveProductsForPicker` (confirmed no callers outside `app/admin/occasions/actions.ts`, which Task 2 also updates).

- [ ] **Step 1: Re-read the current file, then replace it**

Read `lib/data/occasions.ts` fresh. Its content as of this plan's writing is:

```typescript
import { withTenant } from '@/lib/prisma'

// Admin list — includes assigned product count, ordered for the settings page.
export async function listOccasions(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )
}

export async function getOccasionBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, slug, status: 'published' } })
  )
}

// For the "assign products" picker — every active product plus whether it's already tagged.
export async function listProductsForOccasionPicker(tenantId: string, occasionId: string) {
  const products = await withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        tagAssignments: { where: { tagId: occasionId }, select: { id: true, sortOrder: true } },
      },
    })
  )

  const assigned = products
    .filter((p) => p.tagAssignments.length > 0)
    .sort((a, b) => a.tagAssignments[0].sortOrder - b.tagAssignments[0].sortOrder)
  const unassigned = products.filter((p) => p.tagAssignments.length === 0)
  return [...assigned, ...unassigned]
}

// For the create-occasion modal — no occasion id exists yet, so no tag assignments to check.
export async function listActiveProductsForPicker(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, price: true, images: true },
    })
  )
}

export async function updateOccasionSettings(
  tenantId: string,
  occasionId: string,
  input: { themeKey?: string; layout?: 'grid' | 'carousel' }
) {
  return withTenant(tenantId, (db) =>
    db.productTag.update({
      where: { id: occasionId, tenantId },
      data: {
        ...(input.themeKey !== undefined ? { themeKey: input.themeKey } : {}),
        ...(input.layout !== undefined ? { layout: input.layout } : {}),
        status: 'draft',
      },
    })
  )
}
```

Replace it with:

```typescript
import { withTenant } from '@/lib/prisma'

// Admin list — includes assigned product count, ordered for the settings page.
export async function listOccasions(tenantId: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  )
}

export async function getOccasionBySlug(tenantId: string, slug: string) {
  return withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, slug, status: 'published' } })
  )
}

export async function updateOccasionSettings(
  tenantId: string,
  occasionId: string,
  input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }
) {
  return withTenant(tenantId, (db) =>
    db.productTag.update({
      where: { id: occasionId, tenantId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.themeKey !== undefined ? { themeKey: input.themeKey } : {}),
        ...(input.layout !== undefined ? { layout: input.layout } : {}),
        status: 'draft',
      },
    })
  )
}

// Additive: adds the given products to this occasion without disturbing existing assignments
// or their order. Skips products already assigned. New assignments are appended after the
// occasion's current highest sortOrder, in the order productIds was given.
export async function assignProductsToOccasion(tenantId: string, occasionId: string, productIds: string[]) {
  if (productIds.length === 0) return

  const [existing, currentMax] = await withTenant(tenantId, (db) =>
    Promise.all([
      db.productTagAssignment.findMany({
        where: { tenantId, tagId: occasionId, productId: { in: productIds } },
        select: { productId: true },
      }),
      db.productTagAssignment.aggregate({
        where: { tenantId, tagId: occasionId },
        _max: { sortOrder: true },
      }),
    ])
  )

  const alreadyAssigned = new Set(existing.map((e) => e.productId))
  const toAdd = productIds.filter((id) => !alreadyAssigned.has(id))
  if (toAdd.length === 0) return

  const startOrder = (currentMax._max.sortOrder ?? -1) + 1
  await withTenant(tenantId, (db) =>
    db.productTagAssignment.createMany({
      data: toAdd.map((productId, index) => ({
        tenantId,
        tagId: occasionId,
        productId,
        sortOrder: startOrder + index,
      })),
    })
  )
}
```

- [ ] **Step 2: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest'

const { mockFindMany, mockAggregate, mockCreateMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockAggregate: vi.fn(),
  mockCreateMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      productTagAssignment: {
        findMany: mockFindMany,
        aggregate: mockAggregate,
        createMany: mockCreateMany,
      },
    })
  ),
}))

import { assignProductsToOccasion } from './occasions'

describe('assignProductsToOccasion', () => {
  it('skips products already assigned and appends the rest after the current max sortOrder', async () => {
    mockFindMany.mockResolvedValueOnce([{ productId: 'p1' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 4 } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1', 'p2', 'p3'])

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p2', sortOrder: 5 },
        { tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p3', sortOrder: 6 },
      ],
    })
  })

  it('does nothing when every product is already assigned', async () => {
    mockFindMany.mockResolvedValueOnce([{ productId: 'p1' }, { productId: 'p2' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 4 } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1', 'p2'])

    expect(mockCreateMany).not.toHaveBeenCalled()
  })

  it('starts sortOrder at 0 when the occasion has no existing assignments', async () => {
    mockFindMany.mockResolvedValueOnce([])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: null } })

    await assignProductsToOccasion('tenant-1', 'occasion-1', ['p1'])

    expect(mockCreateMany).toHaveBeenCalledWith({
      data: [{ tenantId: 'tenant-1', tagId: 'occasion-1', productId: 'p1', sortOrder: 0 }],
    })
  })
})
```

- [ ] **Step 3: Run the test**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/data/occasions.test.ts`
Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add lib/data/occasions.ts lib/data/occasions.test.ts
git commit -m "feat: add additive occasion product assignment, allow renaming occasions"
```

---

### Task 2: Actions layer — drop product requirement from create/edit, add batch-assign action

**Files:**
- Modify: `app/admin/occasions/actions.ts`
- Modify: `app/admin/occasions/actions.test.ts`

**Interfaces:**
- Consumes: `assignProductsToOccasion`, `updateOccasionSettings` from Task 1.
- Produces: `createOccasionAction(input: { name: string; emoji?: string; themeKey: string; layout: 'grid' | 'carousel' }): Promise<ActionResult>` — no longer takes `productIds`.
- Produces: `setOccasionSettings(occasionId: string, input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }): Promise<ActionResult>` — now accepts `name`.
- Produces: `assignProductsToOccasionAction(occasionId: string, productIds: string[]): Promise<ActionResult>` — thin wrapper used by the Products-page batch action (Task 8).
- Removes: `getOccasionProductPicker`, `getNewOccasionProductPicker`, `setOccasionProducts`.
- `setOccasionStatusAction` no longer rejects turning an occasion on when it has 0 products.

- [ ] **Step 1: Re-read the current file, then replace it**

Current content of `app/admin/occasions/actions.ts` as of this plan:

```typescript
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
```

Replace it with:

```typescript
'use server'

import { Prisma } from '@prisma/client'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { listOccasions, updateOccasionSettings, assignProductsToOccasion } from '@/lib/data/occasions'

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

// Creates an occasion with its theme and layout. Products are assigned separately, from the
// Products page's batch "Assign to Occasion" action or the per-product editor — not here.
export async function createOccasionAction(input: {
  name: string
  emoji?: string
  themeKey: string
  layout: 'grid' | 'carousel'
}): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  try {
    await withTenant(tenantId, (db) =>
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

export async function setOccasionSettings(
  occasionId: string,
  input: { name?: string; themeKey?: string; layout?: 'grid' | 'carousel' }
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
// tenant-wide "Publish changes" batch used elsewhere for pending content edits. An occasion
// can go live with zero products — the owner assigns products afterward from Products.
export async function setOccasionStatusAction(occasionId: string, enabled: boolean): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await withTenant(tenantId, (db) =>
    db.productTag.update({ where: { id: occasionId, tenantId }, data: { status: enabled ? 'published' : 'draft' } })
  )
  return {}
}

// Used by the Products page's batch "Assign to Occasion" action (see app/admin/products/batch-actions.ts).
export async function assignProductsToOccasionAction(occasionId: string, productIds: string[]): Promise<ActionResult> {
  const { tenantId } = await requireOwnerTenant()
  const occasion = await withTenant(tenantId, (db) =>
    db.productTag.findFirst({ where: { tenantId, id: occasionId }, select: { id: true } })
  )
  if (!occasion) return { error: 'Occasion not found.' }

  await assignProductsToOccasion(tenantId, occasionId, productIds)
  return {}
}
```

- [ ] **Step 2: Update the test file to match the new signatures**

Replace `app/admin/occasions/actions.test.ts` entirely with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRequireOwnerTenant, mockFindFirst, mockCreate, mockUpdate, mockDelete, mockTransaction } = vi.hoisted(() => ({
  mockRequireOwnerTenant: vi.fn(async () => ({ userId: 'u1', tenantId: 'tenant-1' })),
  mockFindFirst: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockTransaction: vi.fn(),
}))

vi.mock('@/lib/admin-guard', () => ({ requireOwnerTenant: mockRequireOwnerTenant }))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => Promise<unknown>) =>
    fn({
      productTag: { findFirst: mockFindFirst, create: mockCreate, update: mockUpdate, delete: mockDelete },
      productTagAssignment: { deleteMany: vi.fn() },
      $transaction: mockTransaction,
    })
  ),
}))

import { createOccasionAction, setOccasionStatusAction, deleteOccasion } from './actions'

describe('createOccasionAction', () => {
  beforeEach(() => {
    mockCreate.mockReset()
  })

  it('creates the occasion with no products required', async () => {
    mockCreate.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await createOccasionAction({ name: 'Wedding', themeKey: 'wedding-gold', layout: 'grid' })

    expect(result.error).toBeUndefined()
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        name: 'Wedding',
        slug: 'wedding',
        emoji: null,
        themeKey: 'wedding-gold',
        layout: 'grid',
        status: 'draft',
      },
    })
  })
})

describe('setOccasionStatusAction', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockUpdate.mockReset()
  })

  it('turns an occasion on even with zero products', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'published' } })
  })

  it('turns an occasion off', async () => {
    mockFindFirst.mockResolvedValueOnce({ id: 'occasion-1' })

    const result = await setOccasionStatusAction('occasion-1', false)

    expect(result.error).toBeUndefined()
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: 'occasion-1', tenantId: 'tenant-1' }, data: { status: 'draft' } })
  })

  it('rejects an unknown occasion', async () => {
    mockFindFirst.mockResolvedValueOnce(null)

    const result = await setOccasionStatusAction('occasion-1', true)

    expect(result.error).toBe('Occasion not found.')
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('deleteOccasion', () => {
  beforeEach(() => {
    mockFindFirst.mockReset()
    mockTransaction.mockReset()
  })

  it('rejects deleting a default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: true })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBe('Default occasions cannot be deleted.')
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('deletes a non-default occasion', async () => {
    mockFindFirst.mockResolvedValueOnce({ isDefault: false })

    const result = await deleteOccasion('occasion-1')

    expect(result.error).toBeUndefined()
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run app/admin/occasions/actions.test.ts`
Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add app/admin/occasions/actions.ts app/admin/occasions/actions.test.ts
git commit -m "feat: occasions no longer require products to create or publish"
```

---

### Task 3: UI — remove the product picker from the occasion modal, make name editable, drop the toggle gate

**Files:**
- Modify: `app/admin/occasions/occasions-client.tsx`

**Interfaces:**
- Consumes: `createOccasionAction`, `setOccasionSettings`, `deleteOccasion`, `setOccasionStatusAction` from Task 2 (no longer imports the removed pickers/`setOccasionProducts`).

- [ ] **Step 1: Re-read the current file, then replace it**

Replace the full content of `app/admin/occasions/occasions-client.tsx` with:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, X } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { OCCASION_THEMES, SELECTABLE_OCCASION_THEMES } from '@/lib/occasion-themes'
import { createOccasionAction, deleteOccasion, setOccasionSettings, setOccasionStatusAction } from './actions'

type OccasionRow = {
  id: string
  name: string
  slug: string
  emoji: string | null
  isDefault: boolean
  themeKey: string | null
  layout: 'grid' | 'carousel'
  status: string
  _count: { products: number }
}

/* ── Small controls ── */

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-[26px] w-12 shrink-0 cursor-pointer items-center rounded-full px-[2px] transition-colors ${checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'}`}
    >
      <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  )
}

function ThemePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-fg">Theme</span>
      <div className="flex flex-wrap gap-2.5">
        {SELECTABLE_OCCASION_THEMES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            className="size-9 shrink-0 rounded-full box-border"
            style={{
              backgroundImage: OCCASION_THEMES[key].gradient,
              border: value === key ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function LayoutToggle({ value, onChange }: { value: 'grid' | 'carousel'; onChange: (v: 'grid' | 'carousel') => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-fg">Layout</span>
      <div className="flex w-fit gap-0.5 rounded-lg bg-bg p-0.5">
        {(['grid', 'carousel'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-md px-4 py-1.5 text-sm capitalize ${
              value === option ? 'bg-surface font-semibold text-fg shadow-sm' : 'font-medium text-muted-warm'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Add/Edit modal ── */

function OccasionEditor({
  open, onClose, occasion, onSaved,
}: {
  open: boolean; onClose: () => void; occasion: OccasionRow | null; onSaved: () => void
}) {
  const isEdit = occasion !== null
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [themeKey, setThemeKey] = useState<string>(SELECTABLE_OCCASION_THEMES[0])
  const [layout, setLayout] = useState<'grid' | 'carousel'>('grid')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(occasion?.name ?? '')
    setEmoji(occasion?.emoji ?? '')
    setThemeKey(occasion?.themeKey ?? SELECTABLE_OCCASION_THEMES[0])
    setLayout(occasion?.layout ?? 'grid')
  }, [open, occasion])

  async function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return }

    setSaving(true)
    setError(null)
    const result = isEdit
      ? await setOccasionSettings(occasion.id, { name: name.trim(), themeKey, layout })
      : await createOccasionAction({ name: name.trim(), emoji: emoji.trim() || undefined, themeKey, layout })
    setSaving(false)

    if (result.error) { setError(result.error); return }
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="md:max-w-[480px]">
      <div className="flex max-h-[95vh] flex-col md:max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-base font-bold text-fg">{isEdit ? 'Configure Occasion' : 'Add New Occasion'}</span>
          <button onClick={onClose} className="cursor-pointer transition-transform active:scale-90"><X className="size-6 text-muted-warm" /></button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-5 p-4">
            {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</div>}

            <div className="flex gap-3">
              {!isEdit && (
                <label className="flex w-20 shrink-0 flex-col gap-1.5">
                  <span className="text-sm font-bold text-fg">Emoji</span>
                  <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} placeholder="🪔" className="rounded-lg border border-border bg-bg px-3 py-[11px] text-center text-xl outline-none focus:border-brand-primary focus:bg-surface" />
                </label>
              )}
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Name *</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Wedding Season" className="rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none focus:border-brand-primary focus:bg-surface" />
              </label>
            </div>

            <ThemePicker value={themeKey} onChange={setThemeKey} />
            <LayoutToggle value={layout} onChange={setLayout} />

            <p className="text-xs text-muted-warm">
              Products aren&apos;t assigned here — use the Products page&apos;s &quot;Assign to Occasion&quot; batch action, or link products individually from each product&apos;s editor.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-md font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-md font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Occasion'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/* ── Main page ── */

export function OccasionsClient({ initialOccasions }: { initialOccasions: OccasionRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OccasionRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const occasions = initialOccasions.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  function openAdd() { setEditTarget(null); setEditorOpen(true) }
  function openEdit(o: OccasionRow) { setEditTarget(o); setEditorOpen(true) }

  async function toggleStatus(o: OccasionRow) {
    const result = await setOccasionStatusAction(o.id, o.status !== 'published')
    if (result.error) { setError(result.error); return }
    setError(null)
    router.refresh()
  }

  async function handleDelete(o: OccasionRow) {
    const result = await deleteOccasion(o.id)
    if (result.error) { setError(result.error); return }
    setError(null)
    router.refresh()
  }

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">
      <div className="mb-1 flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 shadow-sm">
        <Search className="size-[18px] text-muted-warm" />
        <input className="grow bg-transparent text-md outline-none placeholder:text-muted-warm" placeholder="Search occasions..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mb-3 text-xs text-muted-warm">
        Occasions power the storefront&apos;s &quot;Shop by Occasion&quot; strip and each occasion&apos;s own page. Default festivals can&apos;t be deleted, but every occasion can be turned on or off. Assign products from the Products page.
      </p>

      {error && <p className="mb-3 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map((o) => {
          const theme = o.themeKey ? OCCASION_THEMES[o.themeKey] : undefined
          const live = o.status === 'published'
          return (
            <div key={o.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex h-16 items-center justify-center text-3xl" style={{ backgroundImage: theme?.gradient ?? 'linear-gradient(135deg, #6d4c41, #3e2723)' }}>
                {o.emoji || '🎉'}
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-md font-semibold text-fg">{o.name}</p>
                  <Toggle checked={live} onChange={() => toggleStatus(o)} />
                </div>
                <p className="text-xs text-muted-warm capitalize">
                  {o._count.products} product{o._count.products === 1 ? '' : 's'} · {o.layout} · {live ? 'Live' : 'Off'}
                  {o.isDefault && <span className="ml-1.5 rounded-full bg-brand-primary/10 px-2 py-0.5 text-2xs font-semibold text-brand-primary">Default</span>}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(o)} className="flex-1 cursor-pointer rounded-lg border border-border py-1.5 text-xs font-semibold text-fg hover:bg-bg">Configure</button>
                  {!o.isDefault && (
                    <button type="button" onClick={() => handleDelete(o)} className="cursor-pointer rounded-lg border border-border px-2.5 text-muted-warm hover:border-danger hover:text-danger">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {occasions.length === 0 && <p className="col-span-full py-12 text-center text-sm text-muted-warm">No occasions found.</p>}
      </div>

      <button onClick={openAdd} className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8">
        <Plus className="size-7 text-surface" />
      </button>

      <OccasionEditor open={editorOpen} onClose={() => setEditorOpen(false)} occasion={editTarget} onSaved={() => router.refresh()} />
    </div>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/occasions/occasions-client.tsx
git commit -m "feat: occasion modal drops product picker, gains editable name"
```

---

## Part B — Soft delete for products

### Task 4: Schema — add `Product.deletedAt`

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Re-read the current `Product` model, then add the column**

Read `prisma/schema.prisma` fresh (the `Product` model is currently around line 106). Find:

```prisma
  isActive     Boolean  @default(true) @map("is_active")
  status       PublishStatus @default(published)
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
```

Change to:

```prisma
  isActive     Boolean  @default(true) @map("is_active")
  status       PublishStatus @default(published)
  deletedAt    DateTime? @map("deleted_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
```

(Do not touch `PublishStatus`, `status`, or any other field/model — this task is additive-only.)

- [ ] **Step 2: Format, push, regenerate**

Run:
```bash
cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx prisma format && npx prisma db push && npx prisma generate
```
Expected: "Your database is now in sync with your Prisma schema." then "Generated Prisma Client".

If `db push` reports drift unrelated to `deletedAt` (from the other session's concurrent schema work), do **not** run `prisma migrate reset` — that drops data. Re-run `db push` only; it applies additive changes without requiring history sync.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add soft-delete column to products"
```

---

### Task 5: Data layer — filter deleted products everywhere, add bulk mutation functions

**Files:**
- Modify: `lib/data/products.ts`
- Test: `lib/data/products-bulk.test.ts` (new)

**Interfaces:**
- Produces: `softDeleteProducts(tenantId: string, productIds: string[]): Promise<void>`
- Produces: `bulkSetProductsCategory(tenantId: string, productIds: string[], categoryId: string | null): Promise<void>`
- Produces: `bulkSetProductsActive(tenantId: string, productIds: string[], isActive: boolean): Promise<void>`
- Produces: `resetProductsToDefault(tenantId: string, productIds: string[]): Promise<void>` — clears `ProductTagAssignment` + `StorePromotionProduct` rows for the given products.
- `AdminProduct` gains `occasionIds: string[]`.
- All existing read functions (`listProductsForAdmin`, `getProducts`, `getOfferProducts`, `getProductBySlug`) exclude soft-deleted rows.

- [ ] **Step 1: Re-read `lib/data/products.ts` fresh, then apply these targeted edits**

This file has been touched by another session (it now has `department`/`offersOnly`/`status: 'published'` filters not shown in earlier plan drafts). Re-read it first. Apply the following changes to whatever the current content is:

1. In `listProductsForAdmin`'s `db.product.findMany` call, change `where: { tenantId }` to `where: { tenantId, deletedAt: null }`, and add `tagAssignments: { select: { tagId: true } }` to the `include` block (alongside the existing `category: { select: { name: true } }`). In the `.map()` that builds `AdminProduct`, add `occasionIds: p.tagAssignments.map((a) => a.tagId),`.

2. Add `occasionIds: string[]` to the `AdminProduct` type definition.

3. In `getProducts`'s `db.product.findMany` `where` clause, add `deletedAt: null,` alongside the existing `tenantId, isActive: true, status: 'published',` lines.

4. In `getOfferProducts`'s `where` clause, same addition: `deletedAt: null,`.

5. In `getProductBySlug`'s `where` clause: `where: { tenantId, slug, isActive: true, status: 'published', deletedAt: null },`.

6. Append these four new functions at the end of the file:

```typescript
export async function softDeleteProducts(tenantId: string, productIds: string[]): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { deletedAt: new Date() },
    })
  )
}

export async function bulkSetProductsCategory(tenantId: string, productIds: string[], categoryId: string | null): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { categoryId },
    })
  )
}

export async function bulkSetProductsActive(tenantId: string, productIds: string[], isActive: boolean): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.product.updateMany({
      where: { tenantId, id: { in: productIds } },
      data: { isActive },
    })
  )
}

// Clears a product's occasion and offer associations only — name, price, images, category,
// and active/deleted state are untouched.
export async function resetProductsToDefault(tenantId: string, productIds: string[]): Promise<void> {
  await withTenant(tenantId, (db) =>
    db.$transaction([
      db.productTagAssignment.deleteMany({ where: { tenantId, productId: { in: productIds } } }),
      db.storePromotionProduct.deleteMany({ where: { tenantId, productId: { in: productIds } } }),
    ])
  )
}
```

- [ ] **Step 2: Write the test file**

```typescript
import { describe, it, expect, vi } from 'vitest'

const { mockUpdateMany, mockTransaction, mockTagDeleteMany, mockPromoDeleteMany } = vi.hoisted(() => ({
  mockUpdateMany: vi.fn(),
  mockTransaction: vi.fn(),
  mockTagDeleteMany: vi.fn(),
  mockPromoDeleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      product: { updateMany: mockUpdateMany },
      productTagAssignment: { deleteMany: mockTagDeleteMany },
      storePromotionProduct: { deleteMany: mockPromoDeleteMany },
      $transaction: mockTransaction,
    })
  ),
}))

import { softDeleteProducts, bulkSetProductsCategory, bulkSetProductsActive, resetProductsToDefault } from './products'

describe('softDeleteProducts', () => {
  it('sets deletedAt for the given products', async () => {
    await softDeleteProducts('tenant-1', ['p1', 'p2'])
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1', 'p2'] } },
      data: { deletedAt: expect.any(Date) },
    })
  })
})

describe('bulkSetProductsCategory', () => {
  it('updates categoryId for the given products', async () => {
    await bulkSetProductsCategory('tenant-1', ['p1'], 'cat-1')
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1'] } },
      data: { categoryId: 'cat-1' },
    })
  })
})

describe('bulkSetProductsActive', () => {
  it('updates isActive for the given products', async () => {
    await bulkSetProductsActive('tenant-1', ['p1'], false)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', id: { in: ['p1'] } },
      data: { isActive: false },
    })
  })
})

describe('resetProductsToDefault', () => {
  it('clears tag and promotion assignments in one transaction', async () => {
    await resetProductsToDefault('tenant-1', ['p1', 'p2'])
    expect(mockTransaction).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx vitest run lib/data/products-bulk.test.ts`
Expected: 4 passed.

- [ ] **Step 4: Run the existing products test file to confirm no regression**

Run: `npx vitest run lib/data/products.test.ts`
Expected: still passing (the `deletedAt: null` addition to `where` doesn't change the mocked assertions in that file, which check `status`/`isActive` presence, not exact deep-equality of the whole `where` object).

- [ ] **Step 5: Commit**

```bash
git add lib/data/products.ts lib/data/products-bulk.test.ts
git commit -m "feat: soft-delete products, add bulk category/active/reset mutations"
```

---

### Task 6: Data layer — per-product occasion assignment (for the Product Editor)

**Files:**
- Modify: `lib/data/occasions.ts`
- Test: `lib/data/occasions.test.ts` (append)

**Interfaces:**
- Produces: `updateProductOccasions(tenantId: string, productId: string, occasionIds: string[]): Promise<void>` — diffs against current assignments; removes unchecked, adds newly-checked at the end of each target occasion's order.

- [ ] **Step 1: Append to `lib/data/occasions.ts`**

Add at the end of the file (after `assignProductsToOccasion` from Task 1):

```typescript
// Per-product complement to assignProductsToOccasion: replaces which occasions a single
// product belongs to. Diffs against current assignments rather than delete-all-then-recreate,
// so it doesn't disturb other products' sortOrder within a shared occasion.
export async function updateProductOccasions(tenantId: string, productId: string, occasionIds: string[]): Promise<void> {
  const current = await withTenant(tenantId, (db) =>
    db.productTagAssignment.findMany({
      where: { tenantId, productId },
      select: { tagId: true },
    })
  )
  const currentIds = new Set(current.map((c) => c.tagId))
  const wantedIds = new Set(occasionIds)

  const toRemove = [...currentIds].filter((id) => !wantedIds.has(id))
  const toAdd = [...wantedIds].filter((id) => !currentIds.has(id))

  if (toRemove.length > 0) {
    await withTenant(tenantId, (db) =>
      db.productTagAssignment.deleteMany({ where: { tenantId, productId, tagId: { in: toRemove } } })
    )
  }

  for (const tagId of toAdd) {
    const max = await withTenant(tenantId, (db) =>
      db.productTagAssignment.aggregate({ where: { tenantId, tagId }, _max: { sortOrder: true } })
    )
    await withTenant(tenantId, (db) =>
      db.productTagAssignment.create({
        data: { tenantId, tagId, productId, sortOrder: (max._max.sortOrder ?? -1) + 1 },
      })
    )
  }
}
```

- [ ] **Step 2: Append tests to `lib/data/occasions.test.ts`**

Add to the same file created in Task 1 (extend the mock to include `create`, `deleteMany` alongside the existing `findMany`/`aggregate`/`createMany`):

Replace the `vi.hoisted`/`vi.mock` block at the top with:

```typescript
const { mockFindMany, mockAggregate, mockCreateMany, mockCreate, mockDeleteMany } = vi.hoisted(() => ({
  mockFindMany: vi.fn(),
  mockAggregate: vi.fn(),
  mockCreateMany: vi.fn(),
  mockCreate: vi.fn(),
  mockDeleteMany: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn(async (_tenantId: string, fn: (client: unknown) => unknown) =>
    fn({
      productTagAssignment: {
        findMany: mockFindMany,
        aggregate: mockAggregate,
        createMany: mockCreateMany,
        create: mockCreate,
        deleteMany: mockDeleteMany,
      },
    })
  ),
}))
```

Update the import line to also bring in `updateProductOccasions`:

```typescript
import { assignProductsToOccasion, updateProductOccasions } from './occasions'
```

Append this new `describe` block at the end of the file:

```typescript
describe('updateProductOccasions', () => {
  it('removes unchecked occasions and adds newly-checked ones', async () => {
    mockFindMany.mockResolvedValueOnce([{ tagId: 'diwali' }, { tagId: 'pongal' }])
    mockAggregate.mockResolvedValueOnce({ _max: { sortOrder: 2 } })

    await updateProductOccasions('tenant-1', 'p1', ['diwali', 'festive'])

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', productId: 'p1', tagId: { in: ['pongal'] } },
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: { tenantId: 'tenant-1', tagId: 'festive', productId: 'p1', sortOrder: 3 },
    })
  })

  it('does nothing when the selection is unchanged', async () => {
    mockFindMany.mockResolvedValueOnce([{ tagId: 'diwali' }])

    await updateProductOccasions('tenant-1', 'p1', ['diwali'])

    expect(mockDeleteMany).not.toHaveBeenCalled()
    expect(mockCreate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the tests**

Run: `npx vitest run lib/data/occasions.test.ts`
Expected: 5 passed (3 from Task 1 + 2 new).

- [ ] **Step 4: Commit**

```bash
git add lib/data/occasions.ts lib/data/occasions.test.ts
git commit -m "feat: add per-product occasion assignment for the Product Editor"
```

---

## Part C — Batch selection UI on the Products page

### Task 7: Actions layer — bulk action wrappers + return product id on create

**Files:**
- Modify: `app/admin/products/actions.ts`

**Interfaces:**
- Consumes: `softDeleteProducts`, `bulkSetProductsCategory`, `bulkSetProductsActive`, `resetProductsToDefault` (Task 5); `updateProductOccasions` (Task 6); `assignProductsToOccasionAction` (Task 2).
- `createProductAction` now returns the created product's `id`.
- Produces: `bulkAssignToOccasionAction(occasionId: string, productIds: string[]): Promise<{ error?: string }>` (propagates `assignProductsToOccasionAction`'s possible "Occasion not found" error rather than swallowing it — matches the `ActionResult` pattern already used by every other action in this codebase, e.g. `setOccasionSettings`, `deleteOccasion`), `bulkSetCategoryAction(productIds: string[], categoryId: string | null): Promise<void>`, `bulkSetActiveAction(productIds: string[], isActive: boolean): Promise<void>`, `bulkDeleteAction(productIds: string[]): Promise<void>`, `bulkResetToDefaultAction(productIds: string[]): Promise<void>`, `updateProductOccasionsAction(productId: string, occasionIds: string[]): Promise<void>`.

- [ ] **Step 1: Re-read `app/admin/products/actions.ts` fresh, then replace it**

Current content (as of this plan):

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { createProduct, updateProduct, setProductActive, type ProductInput } from '@/lib/data/products'

export async function createProductAction(input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await createProduct(tenantId, input)
  revalidatePath('/admin/products')
}

export async function updateProductAction(id: string, input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await updateProduct(tenantId, id, input)
  revalidatePath('/admin/products')
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await setProductActive(tenantId, id, isActive)
  revalidatePath('/admin/products')
}
```

(If the actual current file differs — e.g. the concurrent session added params — keep whatever else is there and apply the same shape of change: `createProductAction` must return the created row's `id`, and the five new bulk actions below must be added.)

Replace with:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import {
  createProduct,
  updateProduct,
  setProductActive,
  softDeleteProducts,
  bulkSetProductsCategory,
  bulkSetProductsActive,
  resetProductsToDefault,
  type ProductInput,
} from '@/lib/data/products'
import { updateProductOccasions } from '@/lib/data/occasions'
import { assignProductsToOccasionAction } from '@/app/admin/occasions/actions'

export async function createProductAction(input: ProductInput): Promise<string> {
  const { tenantId } = await requireOwnerTenant()
  const created = await createProduct(tenantId, input)
  revalidatePath('/admin/products')
  return created.id
}

export async function updateProductAction(id: string, input: ProductInput) {
  const { tenantId } = await requireOwnerTenant()
  await updateProduct(tenantId, id, input)
  revalidatePath('/admin/products')
}

export async function setProductActiveAction(id: string, isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await setProductActive(tenantId, id, isActive)
  revalidatePath('/admin/products')
}

export async function updateProductOccasionsAction(productId: string, occasionIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await updateProductOccasions(tenantId, productId, occasionIds)
  revalidatePath('/admin/products')
}

export async function bulkAssignToOccasionAction(occasionId: string, productIds: string[]): Promise<{ error?: string }> {
  const result = await assignProductsToOccasionAction(occasionId, productIds)
  if (result.error) return result
  revalidatePath('/admin/products')
  return {}
}

export async function bulkSetCategoryAction(productIds: string[], categoryId: string | null) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsCategory(tenantId, productIds, categoryId)
  revalidatePath('/admin/products')
}

export async function bulkSetActiveAction(productIds: string[], isActive: boolean) {
  const { tenantId } = await requireOwnerTenant()
  await bulkSetProductsActive(tenantId, productIds, isActive)
  revalidatePath('/admin/products')
}

export async function bulkDeleteAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await softDeleteProducts(tenantId, productIds)
  revalidatePath('/admin/products')
}

export async function bulkResetToDefaultAction(productIds: string[]) {
  const { tenantId } = await requireOwnerTenant()
  await resetProductsToDefault(tenantId, productIds)
  revalidatePath('/admin/products')
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (If `createProduct`'s current return shape isn't the raw Prisma row — check `lib/data/products.ts`'s `createProduct` function — adjust `created.id` accordingly; as of Task 5's edits it still does `return withTenant(tenantId, (db) => db.product.create({...}))`, which resolves to the full row including `id`.)

- [ ] **Step 3: Commit**

```bash
git add app/admin/products/actions.ts
git commit -m "feat: add bulk product actions (assign occasion, category, active, delete, reset)"
```

---

### Task 8: Batch action registry

**Files:**
- Create: `app/admin/products/batch-actions.ts`

**Interfaces:**
- Produces: `type BatchAction`, `BATCH_ACTIONS: BatchAction[]` — consumed by `products-client.tsx` (Task 9).

- [ ] **Step 1: Write the file**

```typescript
// Extensible registry for the Products page's batch-selection toolbar. Adding a new batch
// action later means appending one entry here — the toolbar (products-client.tsx) renders
// whatever is in this array and dispatches by `kind`, never needs its own redesign.
export type BatchActionKind = 'occasion-picker' | 'category-picker' | 'confirm' | 'immediate'

export type BatchAction = {
  id: string
  label: string
  variant?: 'default' | 'danger'
  kind: BatchActionKind
  confirmText?: { title: string; body: string } // required when kind === 'confirm'
}

export const BATCH_ACTIONS: BatchAction[] = [
  { id: 'assign-occasion', label: 'Assign to Occasion', kind: 'occasion-picker' },
  { id: 'change-category', label: 'Change Category', kind: 'category-picker' },
  { id: 'set-active', label: 'Mark Active', kind: 'immediate' },
  { id: 'set-inactive', label: 'Mark Inactive', kind: 'immediate' },
  {
    id: 'reset-default',
    label: 'Reset to Default',
    kind: 'confirm',
    confirmText: { title: 'Reset selected products?', body: 'Removes occasion and offer associations for the selected products. Name, price, images, and category are unaffected.' },
  },
  {
    id: 'delete',
    label: 'Delete',
    variant: 'danger',
    kind: 'confirm',
    confirmText: { title: 'Delete selected products?', body: 'Deleted products are hidden from your storefront and admin list immediately. This can be undone by contacting support.' },
  },
]
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/admin/products/batch-actions.ts
git commit -m "feat: add extensible batch-action registry for the Products page"
```

---

### Task 9: Products page — selection, batch toolbar, occasion/category picker dialogs

**Files:**
- Modify: `app/admin/products/products-client.tsx`
- Modify: `app/admin/products/page.tsx`

**Interfaces:**
- Consumes: `BATCH_ACTIONS`, `BatchAction` (Task 8); `bulkAssignToOccasionAction`, `bulkSetCategoryAction`, `bulkSetActiveAction`, `bulkDeleteAction`, `bulkResetToDefaultAction`, `updateProductOccasionsAction`, `createProductAction` (now returns `Promise<string>`) (Task 7); `getOccasions` from `@/app/admin/occasions/actions` (existing, for the occasion-picker dialog and the Product Editor's Occasions field); `AdminProduct.occasionIds` (Task 5).

- [ ] **Step 1: Re-read `app/admin/products/page.tsx` fresh, then update it to fetch occasions too**

Current content:

```typescript
import { requireOwnerTenant } from '@/lib/admin-guard'
import { listProductsForAdmin, getCategories } from '@/lib/data/products'
import { AdminProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const { tenantId } = await requireOwnerTenant()
  const [products, categories] = await Promise.all([
    listProductsForAdmin(tenantId),
    getCategories(tenantId),
  ])

  return <AdminProductsClient products={products} categories={categories} />
}
```

Replace with:

```typescript
import { requireOwnerTenant } from '@/lib/admin-guard'
import { listProductsForAdmin, getCategories } from '@/lib/data/products'
import { listOccasions } from '@/lib/data/occasions'
import { AdminProductsClient } from './products-client'

export const dynamic = 'force-dynamic'

export default async function AdminProductsPage() {
  const { tenantId } = await requireOwnerTenant()
  const [products, categories, occasions] = await Promise.all([
    listProductsForAdmin(tenantId),
    getCategories(tenantId),
    listOccasions(tenantId),
  ])

  return <AdminProductsClient products={products} categories={categories} occasions={occasions} />
}
```

- [ ] **Step 2: Re-read `app/admin/products/products-client.tsx` fresh — apply the following changes**

This file is large (534 lines as of this plan) and unmodified by the other session (confirmed via `git status`). Re-read it fresh to get exact current line content before editing, then apply these changes:

**2a. Imports** — add at the top, alongside existing imports:

```typescript
import { CheckSquare, Square } from 'lucide-react'
import { BATCH_ACTIONS, type BatchAction } from './batch-actions'
import {
  bulkAssignToOccasionAction,
  bulkSetCategoryAction,
  bulkSetActiveAction,
  bulkDeleteAction,
  bulkResetToDefaultAction,
  updateProductOccasionsAction,
} from './actions'
```

Add a type import for the occasion shape (matching what `listOccasions` returns — `id`, `name`, `emoji`):

```typescript
type OccasionOption = { id: string; name: string; emoji: string | null }
```

**2b. `AdminProductsClient` props** — change the function signature from:

```typescript
export function AdminProductsClient({ products, categories }: { products: AdminProduct[]; categories: CategoryMeta[] }) {
```

to:

```typescript
export function AdminProductsClient({ products, categories, occasions }: { products: AdminProduct[]; categories: CategoryMeta[]; occasions: OccasionOption[] }) {
```

**2c. Selection state** — inside `AdminProductsClient`, alongside the existing `useState` calls, add:

```typescript
const [selected, setSelected] = useState<Set<string>>(new Set())
const [pickerAction, setPickerAction] = useState<BatchAction | null>(null)
const [pickerBusy, setPickerBusy] = useState(false)

function toggleSelected(id: string) {
  setSelected((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
}

function selectAllVisible() {
  setSelected(new Set(filtered.map((p) => p.id)))
}

function selectByCategory(categoryId: string) {
  setSelected(new Set(filtered.filter((p) => p.categoryId === categoryId).map((p) => p.id)))
}

function clearSelection() {
  setSelected(new Set())
}

async function runBatchAction(action: BatchAction, extra?: { occasionId?: string; categoryId?: string | null }) {
  const ids = [...selected]
  if (ids.length === 0) return

  if (action.id === 'assign-occasion' && extra?.occasionId) {
    const result = await bulkAssignToOccasionAction(extra.occasionId, ids)
    if (result.error) {
      window.alert(result.error)
      return
    }
  } else if (action.id === 'change-category') {
    await bulkSetCategoryAction(ids, extra?.categoryId ?? null)
  } else if (action.id === 'set-active') {
    await bulkSetActiveAction(ids, true)
  } else if (action.id === 'set-inactive') {
    await bulkSetActiveAction(ids, false)
  } else if (action.id === 'reset-default') {
    await bulkResetToDefaultAction(ids)
  } else if (action.id === 'delete') {
    await bulkDeleteAction(ids)
  }

  clearSelection()
  router.refresh()
}

async function handleBatchActionClick(action: BatchAction) {
  if (action.kind === 'occasion-picker' || action.kind === 'category-picker') {
    setPickerAction(action)
    return
  }
  if (action.kind === 'confirm') {
    if (!window.confirm(`${action.confirmText!.title}\n\n${action.confirmText!.body}`)) return
  }
  await runBatchAction(action)
}
```

(`filtered` already exists later in the component as the filtered/sorted product list — this code must be placed *after* `filtered` is defined, or `selectAllVisible`/`selectByCategory` reordered to reference it via closure; place these functions immediately after the `const filtered = products.filter(...).sort(...)` block, not before it.)

**2d. Batch toolbar UI** — add this JSX just before the closing `</div>` that wraps the whole component (i.e. right before the `{/* Modals */}` comment block, so it overlays above the FAB):

```typescript
{selected.size > 0 && (
  <div className="fixed inset-x-4 bottom-24 z-40 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3 shadow-lg md:inset-x-auto md:bottom-8 md:left-1/2 md:-translate-x-1/2">
    <span className="mr-1 text-sm font-semibold text-fg">{selected.size} selected</span>
    {BATCH_ACTIONS.map((action) => (
      <button
        key={action.id}
        onClick={() => handleBatchActionClick(action)}
        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
          action.variant === 'danger' ? 'border-danger text-danger hover:bg-danger/10' : 'border-border text-fg hover:bg-bg'
        }`}
      >
        {action.label}
      </button>
    ))}
    <button onClick={clearSelection} className="cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-warm hover:text-fg">
      Clear
    </button>
  </div>
)}

{pickerAction && (
  <Dialog open onClose={() => setPickerAction(null)}>
    <div className="flex max-h-[70vh] flex-col p-4">
      <span className="mb-3 text-base font-bold text-fg">{pickerAction.label}</span>
      <div className="flex-1 overflow-y-auto">
        {pickerAction.kind === 'occasion-picker' &&
          occasions.map((o) => (
            <button
              key={o.id}
              disabled={pickerBusy}
              onClick={async () => {
                setPickerBusy(true)
                await runBatchAction(pickerAction, { occasionId: o.id })
                setPickerBusy(false)
                setPickerAction(null)
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-fg hover:bg-bg disabled:opacity-50"
            >
              <span className="text-lg leading-none">{o.emoji || '🎉'}</span>
              {o.name}
            </button>
          ))}
        {pickerAction.kind === 'category-picker' &&
          categories.map((c) => (
            <button
              key={c.id}
              disabled={pickerBusy}
              onClick={async () => {
                setPickerBusy(true)
                await runBatchAction(pickerAction, { categoryId: c.id })
                setPickerBusy(false)
                setPickerAction(null)
              }}
              className="flex w-full cursor-pointer items-center rounded-lg px-2 py-2 text-left text-sm text-fg hover:bg-bg disabled:opacity-50"
            >
              {c.name}
            </button>
          ))}
      </div>
      <button onClick={() => setPickerAction(null)} className="mt-3 cursor-pointer rounded-lg border border-border py-2.5 text-sm font-semibold text-fg">
        Cancel
      </button>
    </div>
  </Dialog>
)}
```

**2e. Row checkboxes** — in the desktop table row (the `<div key={p.id} className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_auto] ...">` block), add a checkbox column. Change the grid template from `grid-cols-[2fr_1fr_1fr_1fr_auto]` to `grid-cols-[auto_2fr_1fr_1fr_1fr_auto]` in both the header row and each data row, and add as the first child of each data row (before the product-name `<div>`):

```typescript
<button onClick={(e) => { e.stopPropagation(); toggleSelected(p.id) }} className="flex size-5 cursor-pointer items-center justify-center">
  {selected.has(p.id) ? <CheckSquare className="size-4 text-brand-primary" /> : <Square className="size-4 text-border" />}
</button>
```

Add a matching empty `<span />` as the first child of the header row (to keep columns aligned), and prepend a header "select all" checkbox in its place instead:

```typescript
<button onClick={selected.size === filtered.length && filtered.length > 0 ? clearSelection : selectAllVisible} className="flex size-5 cursor-pointer items-center justify-center">
  {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare className="size-4 text-brand-primary" /> : <Square className="size-4 text-border" />}
</button>
```

Apply the equivalent single checkbox (no header row exists on mobile) to the mobile list row, as the first child of each `<div key={p.id} className="flex cursor-pointer items-center gap-3 ...">` block.

**2f. Select-by-category dropdown** — add near the search bar (inside the `<div className="flex items-center gap-2 pb-3">` block, after the search input, before the mobile filter button):

```typescript
<select
  onChange={(e) => { if (e.target.value) selectByCategory(e.target.value); e.target.value = '' }}
  defaultValue=""
  className="hidden h-10 cursor-pointer rounded-lg border border-border bg-surface px-2 text-sm text-muted-warm outline-none md:block"
>
  <option value="" disabled>Select by category…</option>
  {categories.map((c) => (
    <option key={c.id} value={c.id}>{c.name}</option>
  ))}
</select>
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Manual verification (this is a UI-heavy task without a fast unit-test path)**

Start the dev server, navigate to `/dev/store/silk/admin/products` (as the tenant owner), and verify:
- Checkboxes appear per row and toggle selection.
- "Select by category" populates the selection with only that category's visible rows.
- Selecting ≥1 row shows the floating batch bar with all 6 actions.
- "Assign to Occasion" opens a picker listing seeded occasions; picking one calls the action without error (check via `read_console_messages` / network tab, or re-open the occasion in `/admin/occasions` and confirm the product count increased).
- "Delete" prompts a confirm dialog; confirming removes the selected rows from the list (soft delete — `router.refresh()` re-fetches, and `listProductsForAdmin` now filters `deletedAt: null`).

- [ ] **Step 5: Commit**

```bash
git add app/admin/products/products-client.tsx app/admin/products/page.tsx
git commit -m "feat: add batch selection, select-by-category, and batch action toolbar to Products page"
```

---

### Task 10: Product Editor — Occasions field

**Files:**
- Modify: `app/admin/products/products-client.tsx`

**Interfaces:**
- Consumes: `occasions: OccasionOption[]` prop (already passed into `AdminProductsClient` in Task 9 — thread it down into `ProductEditor`); `updateProductOccasionsAction`, `createProductAction` (now `Promise<string>`) (Task 7).

- [ ] **Step 1: Re-read the current (Task 9-modified) `products-client.tsx`, then apply these changes to `ProductEditor`**

**1a.** Change the `ProductEditor` function signature to accept `occasions`:

```typescript
function ProductEditor({
  open, onClose, editProduct, categories, occasions,
}: {
  open: boolean; onClose: () => void; editProduct: AdminProduct | null; categories: CategoryMeta[]; occasions: OccasionOption[]
}) {
```

**1b.** Add selected-occasions state, alongside the existing `selectedSizes`/`images` state:

```typescript
const [selectedOccasions, setSelectedOccasions] = useState<string[]>([])
```

**1c.** In the `useEffect` that resets form state on open, add:

```typescript
setSelectedOccasions(editProduct?.occasionIds ?? [])
```

**1d.** In `handleSubmit`, after the existing create/update branch succeeds, add the occasion-sync call. Change:

```typescript
    setSaving(true)
    setError(null)
    try {
      if (isEdit) await updateProductAction(editProduct.id, input)
      else await createProductAction(input)
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong saving the product. Please try again.')
    } finally {
      setSaving(false)
    }
```

to:

```typescript
    setSaving(true)
    setError(null)
    try {
      const productId = isEdit ? editProduct.id : await createProductAction(input)
      if (isEdit) await updateProductAction(editProduct.id, input)
      await updateProductOccasionsAction(productId, selectedOccasions)
      router.refresh()
      onClose()
    } catch {
      setError('Something went wrong saving the product. Please try again.')
    } finally {
      setSaving(false)
    }
```

**1e.** Add the Occasions field to the form JSX, after the existing "Sizes Available" block and before the closing `</form>`:

```typescript
<div className="flex flex-col gap-1.5">
  <span className="text-sm font-bold text-fg">Occasions</span>
  <div className="flex flex-wrap gap-2">
    {occasions.map((o) => (
      <label key={o.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-fg has-[:checked]:border-brand-primary has-[:checked]:bg-brand-primary/10">
        <input
          type="checkbox"
          checked={selectedOccasions.includes(o.id)}
          onChange={() => setSelectedOccasions((prev) => prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id])}
          className="size-4 rounded border-border accent-brand-primary"
        />
        {o.emoji || '🎉'} {o.name}
      </label>
    ))}
    {occasions.length === 0 && <p className="text-sm text-muted-warm">No occasions yet — create one under Occasions.</p>}
  </div>
</div>
```

**1f.** Where `AdminProductsClient` renders `<ProductEditor ... />`, add the `occasions` prop:

```typescript
<ProductEditor open={editorOpen} onClose={() => setEditorOpen(false)} editProduct={editProduct} categories={categories} occasions={occasions} />
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Manual verification**

In the dev server, open "Add New Product" — confirm the Occasions checkboxes render and toggle. Save a new product with one occasion checked; confirm (via `/admin/occasions` product count, or a script query) the assignment was created. Edit an existing product that already has occasion assignments (from Task 9's batch-assign test); confirm its Occasions checkboxes come pre-checked.

- [ ] **Step 4: Commit**

```bash
git add app/admin/products/products-client.tsx
git commit -m "feat: add per-product Occasions field to the Product Editor"
```

---

## Final verification (whole plan)

- [ ] **Full typecheck:** `cd "F:/Product/Talam/Web App/Source/talam-web-app" && npx tsc --noEmit` — expect clean.
- [ ] **Full test run:** `npx vitest run lib/data/occasions.test.ts lib/data/products-bulk.test.ts lib/data/products.test.ts app/admin/occasions/actions.test.ts` — expect all passing.
- [ ] **Full build:** `npm run build` — expect success, including `/admin/products` and `/admin/occasions` routes listed.
- [ ] **Re-read `docs/2026-06-23-talam-design.md` v1.13 changelog entry** and confirm every bullet has a corresponding task above — no gaps.
