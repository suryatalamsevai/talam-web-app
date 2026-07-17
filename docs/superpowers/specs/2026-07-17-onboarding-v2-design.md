# Onboarding v2 — Real Persistence, Mandatory Store Details, Go-Live Launch — Design Spec

**Date:** 2026-07-17
**Status:** Draft
**Author:** Surya Prakash + Claude
**Scope:** Wire the onboarding wizard to real DB persistence, add two mandatory store-details steps, replace the placeholder Go Live button with a real launch flow, gate the admin sidebar until onboarding is complete, and replace silent empty-field hiding on the storefront with "coming soon" placeholders.

**Supersedes:** `docs/superpowers/plans/2026-07-17-talam-onboarding-persistence.md` for the schema/guard/actions groundwork (Tasks 1, 5, 6, 7 of that plan are folded in here, extended with the two new steps). That plan's Tasks 2–4 and 8 (subdomain URL helper, post-login redirect resolver, wiring into Google/OTP login, homepage nav entry point) are **not** part of this spec — they're about where a returning user lands after login, orthogonal to this scope, and can still be built later against the same schema fields.

---

## 1. Problem

Today the onboarding wizard (`app/admin/onboarding/`) is 100% client-side state — no Server Actions, no DB writes. The "Go Live" button has no `onClick` at all. `Tenant` has no `isOnboarded` or `onboardingStep` field, so there is no way to know whether a given owner has finished setup. The admin dashboard chrome (`app/admin/layout.tsx`) unconditionally wraps every `/admin/*` route, including onboarding, in the sidebar/bottom-nav — confirmed live: both the desktop and mobile chrome are mounted simultaneously (CSS `hidden`/`md:hidden` picks one per viewport), so the onboarding page currently renders underneath a fully separate wizard header, wasted DOM.

Separately, the storefront silently hides any UI for empty tenant fields (`about-hero.tsx`, `store-footer.tsx`) rather than signaling "this hasn't been filled in yet."

## 2. Decision

Extend the wizard to 7 steps, make every field in every step mandatory, persist each step immediately via Server Actions keyed by the signed-in owner's id, and make "Go Live" a real action that flips `isOnboarded` and redirects to the tenant's live storefront. Gate the dashboard chrome off the `isOnboarded` state indirectly — by hiding it on the one route reachable before completion.

## 3. Schema Additions

```prisma
model Tenant {
  ownerId        String  @unique @db.Uuid @map("owner_id")   // was non-unique
  onboardingStep Int     @default(0) @map("onboarding_step") // new
  isOnboarded    Boolean @default(false) @map("is_onboarded") // new
  ...
}
```

One `Tenant` per owner in V1. `StoreAbout` and `StoreBranch` are unchanged — both already have every field the new steps need.

## 4. Wizard Steps (5 → 7)

| # | Step | Fields | Persists to |
|---|------|--------|--------------|
| 1 | Store & website | name, slug, category | `Tenant` |
| 2 | Brand | logo (required to select, not uploaded — see §7), brand color | `Tenant.brandColor` |
| 3 | **Contact & Address** *(new)* | contactPhone, contactEmail, branch name/address/city | `Tenant.contactPhone/contactEmail`, `StoreBranch` upsert |
| 4 | **Your Story** *(new)* | tagline, about description | `Tenant.tagline`, `StoreAbout.description` |
| 5 | Product | name, price, stock, photo (required to select, not uploaded) | `Product` upsert |
| 6 | Payment | provider selection | `Tenant.paymentProvider` |
| 7 | Go Live | — | `Tenant.isOnboarded = true` |

Every field across steps 1–6 becomes required — `validateStep` grows to cover steps 2–4 (currently only 0 and 2 validate anything). **The `Skip` button is removed** from `DesktopFooter`/`MobileFooter` entirely, since there is no longer a "finish later" path — every step blocks `Next` until valid.

## 5. Persistence Layer

`lib/admin-guard.ts`:
```typescript
export async function requireOwnerSession(): Promise<{ userId: string }>
```
Redirects to `/auth?next=/admin/onboarding` if there's no Supabase session. Every action below starts with this call.

`app/admin/onboarding/actions.ts` — one action per step, each re-deriving `userId` server-side (never trusting a client-supplied id):

- `saveStoreStep({ storeName, slug, category })` → `tenant.upsert` (create-or-update by `ownerId`)
- `saveBrandStep({ brandColor })` → `tenant.update`
- `saveContactStep({ contactPhone, contactEmail, branchName, branchAddress, branchCity })` → `tenant.update` + `storeBranch.upsert` (first branch row for that tenant)
- `saveStoryStep({ tagline, aboutDescription })` → `tenant.update` + `storeAbout.upsert`
- `saveProductStep({ productName, productPrice, productStock })` → upsert the tenant's first `Product` (unchanged from the original plan: `sizes: ['Free Size']`, matching `prisma/seed.ts` convention)
- `savePaymentStep({ paymentId })` → `tenant.update`
- `completeOnboarding()` → `tenant.update({ isOnboarded: true, onboardingStep: 7 })`, returns the storefront URL (§6)

Each action sets `onboardingStep` to its own step index. The wizard only advances `step` locally after the action resolves without an error, same failure-safety as the original plan. Slug uniqueness violations on step 1 surface as `{ error: 'That store URL is taken — try another.' }`, not a raw 500.

The page (`app/admin/onboarding/page.tsx`) becomes an async Server Component: guard, fetch existing `Tenant`/`StoreAbout`/`StoreBranch`/first `Product`, redirect to the storefront if already `isOnboarded`, otherwise render the client wizard seeded from saved state (resume at `onboardingStep`, not always step 0).

## 6. Go Live

Clicking "Go Live" calls `completeOnboarding()`. While the action is in flight, a full-screen overlay replaces the wizard: a looping rocket build-up animation (CSS only — reuse the existing `fadeIn`/gradient-accent system, no new asset pipeline) cycling through status lines ("Packing your store…", "Clearing the launchpad…", "Liftoff! 🚀"). A ~1.2s minimum display time is enforced client-side (`Promise.all([action(), minDelay(1200)])`) so a fast response doesn't flash the overlay instantly away. On resolution, `router.push` to the tenant's **live storefront root** — `/dev/store/{slug}` in local dev, `https://{slug}.{ROOT_DOMAIN}` in prod (same host-detection pattern `proxy.ts` already uses) — not the admin dashboard, so the owner's first look is what customers will see.

## 7. Known Gap Carried Forward

No image upload pipeline exists (no Cloudinary/S3 SDK, no storage bucket — confirmed absent in `next.config.ts` and full dependency scan). Per explicit decision: logo and product photo stay **required to select** in the UI (blocks `Next` until a file is chosen) but the selected file is never uploaded — `Tenant.logoUrl` and `Product.images` stay empty, identical to today's silent gap, just now enforced client-side instead of ignored. A real upload pipeline is out of scope here and flagged as follow-up work.

## 8. Sidebar Gating

`app/admin/layout.tsx`, in `AdminLayout`, immediately after `const pathname = usePathname()`:
```typescript
if (pathname.startsWith('/admin/onboarding')) return <>{children}</>
```
This is the only change needed: `/admin/onboarding` is the sole `/admin/*` route reachable before `isOnboarded` is true (the guard in §5 redirects anyone without a session, and there's no tenant/dashboard to visit yet if one doesn't exist), so skipping chrome on that one route is equivalent to "no sidebar until onboarded," and also fixes the current double-mount waste.

## 9. Storefront Empty States

Replace conditional hiding with muted placeholder copy, keeping layout stable:

- `about-hero.tsx`: `tenant.about?.description` — if absent, render `<p className="italic text-muted-warm/70">Store description coming soon</p>` instead of omitting the paragraph.
- `store-footer.tsx` contact rows: instead of filtering out missing `contactPhone`/`contactEmail`/address rows, render every row always; a missing value renders as `<span className="italic text-muted-warm/70">Coming soon</span>` in place of the value.
- Social icons row (`about-hero.tsx`, `store-footer.tsx`): if zero social links exist, keep hiding the whole row (an empty icon row with no placeholder text reads as broken, not as "coming soon" — different case from a text field).

No new component; the placeholder pattern is applied inline at each existing render site, since each field's surrounding markup already differs.

## 10. Out of Scope

- Post-login redirect resolver, Google/OTP login wiring, homepage "Continue setup" nav link (original plan's Tasks 2–4, 8) — separate concern, not touched here.
- Real image upload pipeline (§7).
- Editing onboarding data after Go Live (that's the existing `/admin/settings` surface, unchanged).

## 11. Testing

- `lib/admin-guard.test.ts` — redirect when no session, returns `userId` when there is one (mock `@/lib/supabase/server`).
- `app/admin/onboarding/actions.test.ts` — one test per action (mock `@/lib/prisma` and `@/lib/admin-guard`), plus the slug-collision case for `saveStoreStep`.
- Pure UI (step components, animation, placeholder copy) — no automated test, per this project's convention of testing money/security/auth paths only.
