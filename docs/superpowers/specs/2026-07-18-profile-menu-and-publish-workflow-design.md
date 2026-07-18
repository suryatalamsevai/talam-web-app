# Profile Dropdown, Tenant Home Page & Draft/Publish Workflow — Design Spec

**Date:** 2026-07-18
**Status:** Approved
**Author:** Surya Prakash + Claude
**Scope:** Turn the marketing nav's profile icon into a dropdown, repurpose `/welcome` into a real tenant home page with a change log, and introduce a draft/publish workflow so content edits in admin no longer go live instantly.

**Supersedes:** §6 of `docs/superpowers/specs/2026-07-17-welcome-page-and-cta-state-design.md` — that spec deleted the nav's `AccountMenu` dropdown in favor of a plain `Link` to `/welcome`. This spec reintroduces a dropdown on the same avatar, but with different content (see §1) than the old `AccountMenu` (name/email + sign-out).

## 1. Profile dropdown

`components/marketing/nav.tsx`'s `Avatar` (currently a plain `<Link href="/welcome">`, lines 91-99) becomes a click-toggle dropdown, following the existing pattern in `components/store/account-menu.tsx` (local `open` state, outside-click-closes via a ref + `mousedown` listener — no new dependency; no dropdown-menu package is installed in this repo).

Two items:
- **"Go to Home Page"** → `/welcome`
- **"Log Out"** → same Supabase sign-out call already used in `app/welcome/sign-out-button.tsx`

The mobile avatar link (`nav.tsx` lines 79-86) gets the same treatment for consistency.

## 2. `/welcome` becomes the tenant home page

No new route. `app/welcome/page.tsx` already does the tenant lookup and store/admin nav links (§5 of the 2026-07-17 spec) — it's extended with a **"Recent publishes"** section (§4 below) between the header and the store/admin link cards. Everything else about that page (states, guard, sign-out button) is unchanged.

## 3. Draft/publish workflow — scope

Admin content edits become drafts; a **Publish** button applies all pending drafts for a tenant at once and logs the event.

**In scope** (content, safe to stage): `Product`, `StoreAbout`, `StoreBanner`, `StorePromotion`, `Occasion`.

**Out of scope** (operational, must stay live-write): `Tenant`'s own fields (`paymentProvider`, `paymentConfig`, `shippingFee`, `notifyEmailOnOrder`, `contactPhone`, etc.) — these are read by checkout/order-notification code paths and staging them adds risk without benefit. `Order` status changes (transactional, not content). Onboarding (`app/admin/onboarding`) — pre-launch wizard, store isn't live yet.

## 4. Data model

```prisma
enum PublishStatus {
  draft
  published
}
```

Added to `Product`, `StoreAbout`, `StoreBanner`, `StorePromotion`, `Occasion`:
```prisma
status PublishStatus @default(published)
```
Default is `published` (not `draft`) so the migration is non-disruptive — every existing row in the DB is already "live" and the storefront looks identical the moment this ships. Only new edits made after this ships start as `draft`.

New model for the publish log shown on `/welcome`:
```prisma
model PublishLog {
  id          String   @id @default(uuid()) @db.Uuid
  tenantId    String   @map("tenant_id") @db.Uuid
  publishedAt DateTime @default(now()) @map("published_at") @db.Timestamptz
  itemCount   Int      @map("item_count")
  summary     String   // e.g. "3 products, 1 banner"

  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@map("publish_logs")
}
```

Storefront reads add `status: 'published'` to their existing `where` filters: `lib/data/tenant.ts` (`getTenantStorefront`), `lib/data/products.ts` (`getProducts`), and the occasions data module. Admin reads (`app/admin/products`, `app/admin/settings`, occasions picker) are unfiltered — owners need to see and edit their own drafts.

## 5. Admin write paths become draft writes

`app/admin/products/actions.ts`, `app/admin/settings/actions.ts`, `app/admin/settings/occasions/actions.ts`: creates/updates that touch the five in-scope models write `status: 'draft'` instead of leaving `status` at its default. (A brand-new row created via one of these actions starts as `draft`, not `published` — the schema default of `published` only exists to keep pre-existing rows live through the migration.)

## 6. Publish action

`publishChangesAction(input?: { force: boolean })` — new server action, colocated with the other admin actions (e.g. `app/admin/actions.ts`, shared across sections):

1. **Conflict pre-check** (skipped if `force: true`): find `Product` rows with `status: draft` for the tenant; for each, check for `OrderItem` rows referencing it whose parent `Order.status IN (pending, confirmed, shipped)`. If any exist, return `{ conflicts: [{ productName, openOrderCount }] }` **without publishing anything**.
2. **Publish**, in a single transaction: bulk-update `status: draft → published` across all five content tables for the tenant; count affected rows; insert one `PublishLog` row with a human-readable `summary` (e.g. "3 products, 1 banner").
3. `revalidatePath` the admin pages and the storefront root so both reflect the change immediately.

No conflict → publishes directly (step 1 finds nothing, proceeds to step 2 in the same call).

## 7. Order-conflict confirmation UI

Triggered by *any* draft change to a product that has open orders — not just price changes, since a customer's order references the product as it existed at order time regardless of which field changed.

Flow: owner clicks **Publish** → `publishChangesAction()` (no `force`) → if `conflicts` comes back non-empty, show a confirmation dialog (reusing the existing `components/ui/dialog.tsx` primitive) listing the affected products and their open-order counts, with copy explaining that publishing may create a mismatch between what customers already ordered and the live listing. The owner must explicitly click **"Publish anyway"** to proceed — that re-invokes `publishChangesAction({ force: true })`, which publishes everything (not just the flagged products; this stays a single all-or-nothing publish, not per-item gating). Cancelling leaves everything in `draft`, unchanged.

Delivered/cancelled/returned orders never trigger this — only `pending`/`confirmed`/`shipped` count as "open."

## 8. UI wiring

A **Publish** button lives in `components/admin/admin-nav-shell.tsx` (shared admin chrome, visible from every admin page), showing a pending-count badge from `SELECT count(*)` across the five tables `WHERE status = 'draft' AND tenantId = ...`. Disabled when the count is 0.

`/welcome`'s new "Recent publishes" section queries the 5 most recent `PublishLog` rows for the tenant (`summary` + relative timestamp, e.g. "3 products, 1 banner — 2 hours ago").

## 9. Out of scope

- Per-item publish/discard (reverting a single draft field back to its published value before publishing). Drafts are edited in place; the only way to discard is to edit again.
- Scheduled/future-dated publishing.
- Publish history beyond the list on `/welcome` (no dedicated `/admin/publish-history` page).
- Multi-user conflict handling (two admins editing the same tenant's drafts simultaneously) — out of scope, matches this project's existing single-owner-per-tenant assumption.

## 10. Testing

- `publishChangesAction` — unit-test the conflict pre-check (open vs. settled orders) and the bulk-status-flip transaction, mocking Prisma. This is a money/data-integrity-adjacent path (order/product state), so it gets real test coverage per this project's convention.
- Storefront query filters (`status: 'published'`) — covered by existing `lib/data/*` tests if present; otherwise a small addition confirming draft rows are excluded.
- No automated test for the profile dropdown or the `/welcome` publishes list — pure UI/layout, matching this project's convention of testing money/security/auth-adjacent logic only.
