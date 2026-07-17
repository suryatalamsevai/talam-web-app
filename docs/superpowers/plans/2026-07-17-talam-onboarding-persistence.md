# Talam — Post-Login Routing & Per-Step Onboarding Persistence

**Date:** 2026-07-17
**Depends on:** Google sign-in (`app/auth/callback/route.ts`, `lib/prisma.ts` `User` model — already shipped) and Phone OTP (`components/auth/otp-form.tsx` — already shipped).
**Covers:** Design doc §5.1 / Changelog v1.9 (`docs/2026-06-23-talam-design.md`).

**Goal:** Route a signed-in owner from "Start free" straight into onboarding (or their dashboard, if they've already finished), and persist each onboarding step immediately — keyed by the signed-in user's id — instead of writing everything at the very end.

**Tech Stack:** Next.js App Router (Server Actions + Route Handlers), Prisma (`lib/prisma.ts`), `@supabase/ssr` session (`lib/supabase/server.ts`, `lib/supabase/client.ts`), Vitest.

## Global Constraints

- One `Tenant` per owner in V1 (`Tenant.ownerId` becomes `@unique`) — matches the design doc's "owns a Tenant already" check, which is a boolean, not a list.
- Every Server Action re-derives the current user from the Supabase session server-side (`supabase.auth.getUser()`) — never trust a client-supplied user id or tenant id for a write.
- `Tenant.slug`/`Tenant.name` stay required (no schema relaxation) — Step 1 already collects both, so the row is created with everything the schema requires, not before.
- Logo upload (Brand step) and product photo upload (Product step) are **not** wired to real storage in this plan — there's no Cloudinary pipeline in the codebase yet (confirmed: no SDK usage anywhere, only `next.config.ts` remote patterns). Those two fields stay client-only until that pipeline exists. Flag, don't invent an upload path.
- Restart (not reload) the dev server after any Prisma schema change, per this project's Preview Tool Glitches convention.
- Money/security-adjacent paths (auth guard, ownership checks) get a real test; pure UI prefill does not.

## Known Gaps (flagged, not silently invented)

- `docs/superpowers/plans/2026-07-06-talam-phase-5-tenant-admin-data.md` already sketches a `requireOwner()` guard, but assumes admin lives at `app/store/admin/*`. The actual app has admin at `app/admin/*` directly (confirmed via `Glob`) — that plan predates the real route layout and is stale on this point. This plan's guard targets the real path.
- `app/admin/layout.tsx` unconditionally wraps every `/admin/*` route (including `/admin/onboarding`) in the dashboard sidebar/header chrome. The onboarding wizard has its own full-screen header/stepper — without a fix, a real signed-in owner landing there sees double chrome. Task 1 below fixes this as a prerequisite, since this plan is what makes that route reachable by real users for the first time.
- Brand-step and Product-step file inputs (`File | null` state) have no upload pipeline. This plan persists every other field on those two steps and leaves `logoUrl` / product `images` untouched (not even a placeholder URL — an empty array is what `Product.images` already defaults to structurally).

---

### Task 1: Schema — onboarding state fields + one-tenant-per-owner

**Files:**
- Modify: `prisma/schema.prisma`
- Migration: `npx prisma migrate dev --name tenant_onboarding_state`

**Changes to `Tenant`:**
```prisma
ownerId        String   @unique @db.Uuid @map("owner_id")
onboardingStep Int      @default(0) @map("onboarding_step")
isOnboarded    Boolean  @default(false) @map("is_onboarded")
```
(`isOnboarded` is new — it was designed in Changelog v1.8 but never actually added to the schema; confirm via `grep -i onboarded prisma/schema.prisma` before writing the migration, since if it turns out to already exist this step shrinks to just the other two fields.)

- [ ] Add the three fields/attributes to `model Tenant` in `prisma/schema.prisma`.
- [ ] Run `npx prisma migrate dev --name tenant_onboarding_state`. If it fails on existing seeded rows sharing an `ownerId` (unlikely — seed data uses one owner per tenant today), fix the seed data first rather than dropping the constraint.
- [ ] Run `npx prisma generate` and restart the dev server (per Preview Tool Glitches convention — a running dev server keeps the pre-migration Prisma Client in memory).
- [ ] `npx tsc --noEmit` clean.

```
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add tenant onboarding_step/is_onboarded and unique owner_id"
```

---

### Task 2: Subdomain-aware admin URL helper

**Files:**
- Create: `lib/tenant-url.ts`
- Create: `lib/tenant-url.test.ts`

**Why:** A tenant's admin panel is served from `{slug}.talam4shop.com/admin` in production (§3.1), but the onboarding wizard runs on the root domain (no subdomain exists until Step 1 creates the `Tenant`). Local dev has no wildcard subdomains at all — it uses the `/dev/store/{slug}/admin` proxy alias (`proxy.ts`, `getDevRouteDecision`). A bare relative redirect to `/admin/dashboard` would resolve against whatever host the browser is currently on — wrong in both cases once a real tenant exists.

**Interface:**
```typescript
export function getAdminUrl(slug: string, page: 'onboarding' | 'dashboard', isLocalDev: boolean): string
```
- `isLocalDev` — caller-supplied, not inferred from `NODE_ENV` inside this function, since a Server Action and a client component determine "are we on localhost" differently (server: read the request `host` header; client: `window.location.hostname`). Keeping the check as a caller-supplied boolean keeps this function pure and trivially testable.
- Dev: `/dev/store/${slug}/admin/${page}`
- Prod: `https://${slug}.${ROOT_DOMAIN}/admin/${page}` where `ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'` (same fallback `proxy.ts` uses).

- [ ] Write `lib/tenant-url.test.ts` covering: dev + onboarding, dev + dashboard, prod + dashboard (assert absolute `https://` URL with the tenant slug as subdomain).
- [ ] Implement `lib/tenant-url.ts`.
- [ ] `npm run test:run -- lib/tenant-url.test.ts` passes.

```
git add lib/tenant-url.ts lib/tenant-url.test.ts
git commit -m "feat: add subdomain-aware admin URL helper"
```

---

### Task 3: Post-login redirect resolver

**Files:**
- Create: `lib/onboarding.ts`
- Create: `lib/onboarding.test.ts`

**Interface:**
```typescript
export async function getPostLoginRedirect(userId: string, isLocalDev: boolean): Promise<string>
```
Looks up `prisma.tenant.findUnique({ where: { ownerId: userId }, select: { slug: true, isOnboarded: true } })`:
- No row → `/admin/onboarding` (root domain — no tenant/subdomain exists yet).
- Row exists, `isOnboarded` false → `/admin/onboarding` (still root domain — Task 5's page reads `onboardingStep` itself to resume; this resolver only decides which top-level destination to send the browser to).
- Row exists, `isOnboarded` true → `getAdminUrl(slug, 'dashboard', isLocalDev)`.

- [ ] Write `lib/onboarding.test.ts` (mock `@/lib/prisma`, three cases above).
- [ ] Implement `lib/onboarding.ts`.
- [ ] `npm run test:run -- lib/onboarding.test.ts` passes.

```
git add lib/onboarding.ts lib/onboarding.test.ts
git commit -m "feat: add shared post-login redirect resolver"
```

---

### Task 4: Wire the resolver into both login methods

**Files:**
- Modify: `app/auth/callback/route.ts` (Google — already exists from the prior sign-in task)
- Modify: `components/auth/otp-form.tsx` (Phone OTP — currently has no post-verify navigation at all)
- Create: `app/auth/actions.ts` (small Server Action so the client OTP form can call the Prisma-backed resolver)

**Google callback change** — replace the current unconditional `redirect(new URL(next, request.url))` with:
```typescript
const next = searchParams.get('next') ?? await getPostLoginRedirect(user.id, request.headers.get('host')?.includes('localhost') ?? false)
return NextResponse.redirect(new URL(next, request.url))
```
(Keep the explicit `?next=` override for cases like re-authenticating mid-checkout — this plan only changes the *default* when no `next` is given.)

**New `app/auth/actions.ts`:**
```typescript
'use server'
import { createServerClient } from '@/lib/supabase/server'
import { getPostLoginRedirect } from '@/lib/onboarding'
import { headers } from 'next/headers'

export async function resolvePostLoginRedirect(): Promise<string> {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '/auth'
  const host = (await headers()).get('host') ?? ''
  return getPostLoginRedirect(user.id, host.includes('localhost'))
}
```

**OTP form change** (`components/auth/otp-form.tsx`) — in `handleVerifyOtp`, on success:
```typescript
if (!error) {
  const destination = await resolvePostLoginRedirect()
  router.push(destination)
}
```
(Needs `useRouter` from `next/navigation`, imported alongside the existing hooks — the file has no router usage today.)

- [ ] Add the Server Action.
- [ ] Wire the Google callback route.
- [ ] Wire the OTP form.
- [ ] Manual check: sign in via Google with no existing `Tenant` → land on `/admin/onboarding`. Sign in via OTP the same way → same destination. (Automated test optional here — this is thin wiring around already-tested `getPostLoginRedirect`; the sibling test suites cover the logic.)

```
git add app/auth/callback/route.ts app/auth/actions.ts components/auth/otp-form.tsx
git commit -m "feat: route both login methods through the post-login redirect resolver"
```

---

### Task 5: Fix nested onboarding chrome (prerequisite for Task 6)

**Files:**
- Modify: `app/admin/layout.tsx`

- [ ] In `AdminLayout`, before rendering the sidebar/header chrome, add:
```typescript
if (pathname.startsWith('/admin/onboarding')) return <>{children}</>
```
placed right after the existing `const pathname = usePathname()` line. The onboarding page renders its own full-screen header/stepper (`app/admin/onboarding/page.tsx`'s `MobileHeader`/`DesktopSidebar`) — it should not also get the dashboard sidebar/header.

```
git add app/admin/layout.tsx
git commit -m "fix: skip dashboard chrome for the onboarding wizard route"
```

---

### Task 6: Auth guard + resume-aware onboarding page

**Files:**
- Create: `lib/admin-guard.ts`
- Create: `lib/admin-guard.test.ts`
- Modify: `app/admin/onboarding/page.tsx` (becomes an `async` Server Component — guard, fetch, redirect-if-already-onboarded, render the wizard with initial props)
- Rename: current default-exported client component moves to `app/admin/onboarding/onboarding-wizard.tsx` (same JSX/state code, just parameterized initial values instead of hardcoded placeholders like `"Priya's Boutique"`)

**`lib/admin-guard.ts` interface:**
```typescript
export async function requireOwnerSession(): Promise<{ userId: string }>
```
Redirects to `/auth?next=/admin/onboarding` if there's no Supabase session. (This is intentionally narrower than the full `requireOwner()` sketched in the stale phase-5 plan, which also verifies `tenant.ownerId === user.id` for an *existing* tenant — onboarding has no tenant yet on first visit, so it only needs "is someone logged in," not "do they own this tenant.")

- [ ] Write `lib/admin-guard.test.ts` (mock `@/lib/supabase/server`; asserts redirect when no session, returns `userId` when there is one).
- [ ] Implement `lib/admin-guard.ts`.
- [ ] `npm run test:run -- lib/admin-guard.test.ts` passes.

**`app/admin/onboarding/page.tsx` becomes:**
```typescript
export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await requireOwnerSession()
  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: { products: { take: 1, orderBy: { createdAt: 'asc' } } },
  })

  if (tenant?.isOnboarded) {
    redirect(getAdminUrl(tenant.slug, 'dashboard', /* isLocalDev */ (await headers()).get('host')?.includes('localhost') ?? false))
  }

  return <OnboardingWizard initialTenant={tenant} initialProduct={tenant?.products[0] ?? null} />
}
```
- [ ] Move the existing stepper JSX/state into `onboarding-wizard.tsx` unchanged, except: seed each `useState` from `initialTenant`/`initialProduct` instead of the current hardcoded placeholders (`"Priya's Boutique"`, `'Clothing'`, etc. — fall back to those same placeholders only when `initialTenant` is null, i.e. a brand-new owner), and seed `step` from `initialTenant?.onboardingStep ?? 0`.
- [ ] `npx tsc --noEmit` clean.

```
git add lib/admin-guard.ts lib/admin-guard.test.ts app/admin/onboarding/page.tsx app/admin/onboarding/onboarding-wizard.tsx
git commit -m "feat: guard onboarding route and resume from saved progress"
```

---

### Task 7: Per-step persistence Server Actions

**Files:**
- Create: `app/admin/onboarding/actions.ts`
- Create: `app/admin/onboarding/actions.test.ts`
- Modify: `app/admin/onboarding/onboarding-wizard.tsx` (call the matching action from `goNext`/the Go Live button, instead of only updating local state)

Every action starts identically:
```typescript
const { userId } = await requireOwnerSession()
```
then does its own upsert:

| Step | Action | Persists | `onboardingStep` set to |
|---|---|---|---|
| 1 — Store | `saveStoreStep({ storeName, slug, category })` | `prisma.tenant.upsert({ where: { ownerId }, create: { ownerId, name, slug, storeType: category }, update: { name, slug, storeType: category } })` | 1 |
| 2 — Brand | `saveBrandStep({ brandColor })` | `prisma.tenant.update({ where: { ownerId }, data: { brandColor } })` | 2 |
| 3 — Product | `saveProductStep({ productName, productPrice, productStock })` | upsert the tenant's first `Product` (`sizes: ['Free Size']`, `stockBySize: { 'Free Size': stock }` — matches the no-variant convention already used in `prisma/seed.ts`) | 3 |
| 4 — Payment | `savePaymentStep({ paymentId })` | `prisma.tenant.update({ where: { ownerId }, data: { paymentProvider: mapPaymentId(paymentId) } })` — `mapPaymentId`: `upi → upi_manual`, `razorpay → razorpay`, `instamojo → instamojo` | 4 |
| 5 — Go Live | `completeOnboarding()` | `prisma.tenant.update({ where: { ownerId }, data: { isOnboarded: true, onboardingStep: 5 } })`, returns `getAdminUrl(slug, 'dashboard', isLocalDev)` | 5 |

- Step 1's slug must stay unique — reuse the existing `@unique` DB constraint and surface a friendly error (catch the Prisma unique-violation, return `{ error: 'That store URL is taken — try another.' }`) rather than a raw 500, matching how `validateStep` in the current wizard already surfaces field errors.
- [ ] Write `app/admin/onboarding/actions.test.ts`: one test per action (mock `@/lib/prisma` and `@/lib/admin-guard`), plus the slug-collision-returns-friendly-error case for `saveStoreStep`.
- [ ] Implement `app/admin/onboarding/actions.ts`.
- [ ] Wire each action into `onboarding-wizard.tsx`'s `goNext`/Go Live handlers — call the action, and only advance `step` locally after it resolves without an error (so a failed save doesn't silently advance past a lost step).
- [ ] `npm run test:run -- app/admin/onboarding/actions.test.ts` passes.
- [ ] `npx tsc --noEmit` clean.

```
git add app/admin/onboarding/actions.ts app/admin/onboarding/actions.test.ts app/admin/onboarding/onboarding-wizard.tsx
git commit -m "feat: persist each onboarding step immediately, keyed by owner id"
```

---

### Task 8: "Continue setup" entry point for already-signed-in visitors

**Files:**
- Modify: `components/marketing/nav.tsx` (`AccountMenu`)

Once signed in, the homepage nav shows the avatar dropdown instead of "Start free" — a returning owner who lands on the homepage while signed in currently has no link back into onboarding/dashboard from there.

- [ ] Add a menu item to `AccountMenu` — label "Continue setup" if no tenant / not yet onboarded, "Dashboard" if already onboarded (client-side: call `resolvePostLoginRedirect()` from Task 4 on click, then `router.push` — same resolver, no new logic).

```
git add components/marketing/nav.tsx
git commit -m "feat: add continue-setup/dashboard link to the signed-in nav menu"
```

---

## Verification (end to end)

1. `npx tsc --noEmit` and full test suite (`npm run test:run`) both clean.
2. Fresh Google (or OTP) sign-in with no existing `Tenant` for that user → lands on `/admin/onboarding` at Step 1, no dashboard chrome behind it.
3. Complete Step 1 (unique store name/slug) → check `tenants` table: a row now exists with `owner_id`, `onboarding_step = 1`, `is_onboarded = false`.
4. Refresh the browser tab mid-wizard (after Step 2) → reload `/admin/onboarding` directly → wizard resumes at Step 2 (not back to Step 0), fields prefilled from the DB.
5. Try Step 1 with a slug that already exists → friendly inline error, not a 500.
6. Complete all 5 steps → `tenants.is_onboarded = true`, browser redirected to `/dev/store/{slug}/admin/dashboard` (dev) and the dashboard renders (no double chrome, matches Task 5's fix).
7. Sign out, sign back in with the same account → lands directly on the dashboard (not onboarding).
8. From the signed-in homepage nav, click "Dashboard"/"Continue setup" → lands on the same computed destination as step 7/2.
