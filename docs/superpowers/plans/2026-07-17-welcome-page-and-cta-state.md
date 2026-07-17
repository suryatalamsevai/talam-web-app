# Welcome Page & State-Aware CTAs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a signed-in owner a `/welcome` hub page to reach their store or admin panel, and make every marketing-page CTA reflect whether they're signed out, mid-onboarding, or fully live.

**Architecture:** A server action (`getOwnerCtaState`) derives one of three states from the Supabase session + `Tenant.isOnboarded`. A client hook (`useOwnerCta`) wraps it and feeds label/href/subtext into four marketing components (nav, hero, CTA band, pricing). A new `/welcome` Server Component page is the single destination for every signed-in CTA, showing either "View My Store"/"View Admin" cards or a "Continue setup" card. A small `lib/tenant-url.ts` helper (dev proxy path vs. subdomain URL) backs both the welcome page and the existing onboarding redirect.

**Tech Stack:** Next.js App Router (Server Actions + Server Components), Prisma (`lib/prisma.ts`), `@supabase/ssr` session, Vitest.

## Global Constraints

- Every server-side check re-derives the user from the Supabase session — never trust a client-supplied id (existing project convention, see `lib/admin-guard.ts`).
- Money/security/auth-adjacent logic gets a real test (`lib/tenant-url.ts`, `app/actions/owner-cta.ts`); pure UI wiring (the hook, the four component updates, the welcome page layout) does not, per this project's existing testing convention.
- Every signed-in CTA state routes to `/welcome`, never directly to `/admin/onboarding` or the storefront.
- `ROOT_DOMAIN` fallback is `process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'` — reuse, don't reinvent.

---

### Task 1: Subdomain-aware URL helper

**Files:**
- Create: `lib/tenant-url.ts`
- Test: `lib/tenant-url.test.ts`

**Interfaces:**
- Produces: `getStoreUrl(slug: string, isLocalDev: boolean): string`, `getAdminUrl(slug: string, isLocalDev: boolean): string` — consumed by Task 2 (onboarding redirect) and Task 5 (welcome page).

- [ ] **Step 1: Write the failing test**

Create `lib/tenant-url.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { getAdminUrl, getStoreUrl } from './tenant-url'

describe('getStoreUrl', () => {
  it('returns the dev proxy path in local dev', () => {
    expect(getStoreUrl('priya-boutique', true)).toBe('/dev/store/priya-boutique')
  })

  it('returns the subdomain URL in prod', () => {
    expect(getStoreUrl('priya-boutique', false)).toBe('https://priya-boutique.talam4shop.com')
  })
})

describe('getAdminUrl', () => {
  it('returns the dev proxy admin path in local dev', () => {
    expect(getAdminUrl('priya-boutique', true)).toBe('/dev/store/priya-boutique/admin')
  })

  it('returns the subdomain admin URL in prod', () => {
    expect(getAdminUrl('priya-boutique', false)).toBe('https://priya-boutique.talam4shop.com/admin')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run lib/tenant-url.test.ts`
Expected: FAIL — `lib/tenant-url.ts` doesn't exist yet.

- [ ] **Step 3: Implement the helper**

Create `lib/tenant-url.ts`:
```typescript
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'talam4shop.com'

export function getStoreUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}` : `https://${slug}.${ROOT_DOMAIN}`
}

export function getAdminUrl(slug: string, isLocalDev: boolean): string {
  return isLocalDev ? `/dev/store/${slug}/admin` : `https://${slug}.${ROOT_DOMAIN}/admin`
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run lib/tenant-url.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/tenant-url.ts lib/tenant-url.test.ts
git commit -m "feat: add subdomain-aware store/admin URL helper"
```

---

### Task 2: Use the helper in the existing onboarding redirect + generalize the auth guard's redirect target

**Files:**
- Modify: `lib/admin-guard.ts`
- Modify: `app/admin/onboarding/page.tsx`

**Interfaces:**
- Consumes: `getStoreUrl` (Task 1).
- Produces: `requireOwnerSession(nextPath?: string): Promise<{ userId: string }>` (new optional param, default unchanged) — consumed by Task 5 (`requireOwnerSession('/welcome')`).

- [ ] **Step 1: Add an optional redirect-target param to the guard**

Replace the full contents of `lib/admin-guard.ts`:
```typescript
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function requireOwnerSession(nextPath = '/admin/onboarding'): Promise<{ userId: string }> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?next=${nextPath}`)
  }

  return { userId: user.id }
}
```

- [ ] **Step 2: Confirm the existing guard test still passes unmodified**

Run: `npx vitest run lib/admin-guard.test.ts`
Expected: PASS (2 tests) — the default param keeps every existing no-arg call (`requireOwnerSession()`) producing the same `/auth?next=/admin/onboarding` redirect the test already asserts.

- [ ] **Step 3: Replace the inline dev/prod branch in the onboarding page**

In `app/admin/onboarding/page.tsx`, replace the full file contents:
```typescript
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getStoreUrl } from '@/lib/tenant-url'
import { OnboardingWizard } from './onboarding-wizard'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const { userId } = await requireOwnerSession()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    include: {
      about: { select: { description: true } },
      branches: { orderBy: { sortOrder: 'asc' }, take: 1 },
      products: { orderBy: { createdAt: 'asc' }, take: 1 },
    },
  })

  if (tenant?.isOnboarded) {
    const host = (await headers()).get('host')
    const isLocalDev = host?.includes('localhost') ?? false
    redirect(getStoreUrl(tenant.slug, isLocalDev))
  }

  return (
    <OnboardingWizard
      initialTenant={tenant}
      initialBranch={tenant?.branches[0] ?? null}
      initialProduct={tenant?.products[0] ?? null}
    />
  )
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/admin-guard.ts app/admin/onboarding/page.tsx
git commit -m "refactor: generalize owner guard redirect target, reuse store URL helper"
```

---

### Task 3: Owner CTA state server action

**Files:**
- Create: `app/actions/owner-cta.ts`
- Test: `app/actions/owner-cta.test.ts`

**Interfaces:**
- Consumes: `createServerClient` (`lib/supabase/server.ts`), `prisma` (`lib/prisma.ts`).
- Produces: `type OwnerCtaState = 'signed-out' | 'in-progress' | 'onboarded'`, `getOwnerCtaState(): Promise<OwnerCtaState>` — consumed by Task 4 (`useOwnerCta` hook).

- [ ] **Step 1: Write the failing tests**

Create `app/actions/owner-cta.test.ts`:
```typescript
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { findUnique: vi.fn() } },
}))

import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getOwnerCtaState } from './owner-cta'

describe('getOwnerCtaState', () => {
  it('returns signed-out when there is no session', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    } as never)

    expect(await getOwnerCtaState()).toBe('signed-out')
  })

  it('returns in-progress when the tenant has not finished onboarding', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isOnboarded: false } as never)

    expect(await getOwnerCtaState()).toBe('in-progress')
  })

  it('returns in-progress when no tenant row exists yet', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue(null)

    expect(await getOwnerCtaState()).toBe('in-progress')
  })

  it('returns onboarded when the tenant has finished onboarding', async () => {
    vi.mocked(createServerClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    } as never)
    vi.mocked(prisma.tenant.findUnique).mockResolvedValue({ isOnboarded: true } as never)

    expect(await getOwnerCtaState()).toBe('onboarded')
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run app/actions/owner-cta.test.ts`
Expected: FAIL — `app/actions/owner-cta.ts` doesn't exist yet.

- [ ] **Step 3: Implement the action**

Create `app/actions/owner-cta.ts`:
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type OwnerCtaState = 'signed-out' | 'in-progress' | 'onboarded'

export async function getOwnerCtaState(): Promise<OwnerCtaState> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return 'signed-out'

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: user.id },
    select: { isOnboarded: true },
  })

  return tenant?.isOnboarded ? 'onboarded' : 'in-progress'
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run app/actions/owner-cta.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/actions/owner-cta.ts app/actions/owner-cta.test.ts
git commit -m "feat: add owner CTA state server action"
```

---

### Task 4: Shared client hook for marketing CTAs

**Files:**
- Create: `components/marketing/use-owner-cta.ts`

**Interfaces:**
- Consumes: `getOwnerCtaState`, `OwnerCtaState` (Task 3); `createBrowserClient` (`lib/supabase/client.ts`).
- Produces: `useOwnerCta(): { label: string; href: string; subtext?: string } | null` — consumed by Task 5 is not needed (welcome page reads tenant directly), consumed by Task 6 (nav), Task 7 (hero), Task 8 (CTA band), Task 9 (pricing).

- [ ] **Step 1: Create the hook**

Create `components/marketing/use-owner-cta.ts`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createBrowserClient } from '@/lib/supabase/client'
import { getOwnerCtaState, type OwnerCtaState } from '@/app/actions/owner-cta'

type CtaCopy = { label: string; href: string; subtext?: string }

const CTA_COPY: Record<OwnerCtaState, CtaCopy> = {
  'signed-out': { label: 'Start free', href: '/auth' },
  'in-progress': { label: 'Finish Setting Up', href: '/welcome', subtext: 'Pick up where you left off' },
  onboarded: { label: 'View My Store', href: '/welcome', subtext: 'Takes you to your store & admin' },
}

export function useOwnerCta(): CtaCopy | null {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [state, setState] = useState<OwnerCtaState | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (user === undefined) return
    if (user === null) {
      setState('signed-out')
      return
    }
    getOwnerCtaState().then(setState)
  }, [user])

  if (state === null) return null
  return CTA_COPY[state]
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no new errors (not imported anywhere yet, so it type-checks in isolation).

- [ ] **Step 3: Commit**

```bash
git add components/marketing/use-owner-cta.ts
git commit -m "feat: add shared owner-CTA client hook"
```

---

### Task 5: `/welcome` page

**Files:**
- Create: `app/welcome/sign-out-button.tsx`
- Create: `app/welcome/page.tsx`

**Interfaces:**
- Consumes: `requireOwnerSession` (Task 2, called as `requireOwnerSession('/welcome')`), `getStoreUrl`/`getAdminUrl` (Task 1), `createServerClient` (`lib/supabase/server.ts`), `prisma`, `Logo` (`components/logo.tsx`), `createBrowserClient` (`lib/supabase/client.ts`).

- [ ] **Step 1: Create the sign-out button**

Create `app/welcome/sign-out-button.tsx`:
```typescript
'use client'

import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

export function SignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-white/60 hover:text-white transition-colors font-body"
    >
      Sign out
    </button>
  )
}
```

- [ ] **Step 2: Create the page**

Create `app/welcome/page.tsx`:
```typescript
import { headers } from 'next/headers'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { requireOwnerSession } from '@/lib/admin-guard'
import { prisma } from '@/lib/prisma'
import { getAdminUrl, getStoreUrl } from '@/lib/tenant-url'
import { createServerClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

export const dynamic = 'force-dynamic'

export default async function WelcomePage() {
  const { userId } = await requireOwnerSession('/welcome')

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tenant = await prisma.tenant.findUnique({
    where: { ownerId: userId },
    select: { slug: true, isOnboarded: true },
  })

  const host = (await headers()).get('host')
  const isLocalDev = host?.includes('localhost') ?? false
  const name = user?.user_metadata.full_name ?? user?.email ?? ''

  return (
    <main className="min-h-screen bg-bg-dark flex flex-col items-center justify-center gap-10 px-6 py-16">
      <Logo className="text-white text-[26px]" />
      <div className="text-center">
        <p className="font-body text-lg font-semibold text-white">{name}</p>
        {user?.email && <p className="font-body text-sm text-white/50">{user.email}</p>}
      </div>
      <div className="flex w-full max-w-[440px] flex-col gap-4">
        {tenant?.isOnboarded ? (
          <>
            <Link
              href={getStoreUrl(tenant.slug, isLocalDev)}
              className="block rounded-2xl bg-brand-primary px-8 py-5 text-center font-body text-base font-semibold text-white transition-opacity hover:opacity-90"
            >
              View My Store
            </Link>
            <Link
              href={getAdminUrl(tenant.slug, isLocalDev)}
              className="block rounded-2xl border border-white/20 px-8 py-5 text-center font-body text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Admin
            </Link>
          </>
        ) : (
          <Link
            href="/admin/onboarding"
            className="block rounded-2xl bg-brand-primary px-8 py-5 text-center font-body text-base font-semibold text-white transition-opacity hover:opacity-90"
          >
            Continue setup
          </Link>
        )}
      </div>
      <SignOutButton />
    </main>
  )
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/welcome/page.tsx app/welcome/sign-out-button.tsx
git commit -m "feat: add /welcome hub page for signed-in owners"
```

---

### Task 6: Nav — avatar becomes a link, CTA becomes state-aware

**Files:**
- Modify: `components/marketing/nav.tsx`

**Interfaces:**
- Consumes: `useOwnerCta` (Task 4).

- [ ] **Step 1: Replace the full file contents**

Replace `components/marketing/nav.tsx`:
```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { Logo } from '@/components/logo'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@/lib/supabase/client'
import { useOwnerCta } from './use-owner-cta'

export function MarketingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const cta = useOwnerCta()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => subscription.unsubscribe()
  }, [])

  return (
    <nav
      className={cn(
        'fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-[60px] py-4 transition-all duration-300',
        scrolled
          ? 'bg-bg-dark/80 backdrop-blur-md border-b border-white/10'
          : 'bg-transparent border-b border-transparent'
      )}
    >
      <Logo className="text-white text-[22px]" />
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Features
        </a>
        <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Pricing
        </a>
        <a href="#faq" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          FAQ
        </a>
        {user ? (
          <Avatar user={user} />
        ) : user === null ? (
          <>
            <Link
              href="/auth"
              className="text-sm text-white/70 hover:text-white transition-colors font-body"
            >
              Sign in
            </Link>
            <Link
              href={cta?.href ?? '/auth'}
              className="px-5 py-[9px] rounded-full bg-brand-primary text-white text-sm font-semibold font-body hover:opacity-90 transition-opacity"
            >
              {cta?.label ?? 'Start free'}
            </Link>
          </>
        ) : null}
      </div>
      {user === null && (
        <Link
          href={cta?.href ?? '/auth'}
          className="md:hidden px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold font-body"
        >
          {cta?.label ?? 'Start free'}
        </Link>
      )}
      {user && (
        <Link
          href="/welcome"
          className="md:hidden flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-white/10 text-white text-sm font-semibold"
        >
          <AvatarContent user={user} />
        </Link>
      )}
    </nav>
  )
}

function Avatar({ user }: { user: User }) {
  return (
    <Link
      href="/welcome"
      className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-white/10 text-white text-sm font-semibold hover:opacity-80 transition-opacity"
    >
      <AvatarContent user={user} />
    </Link>
  )
}

function AvatarContent({ user }: { user: User }) {
  const name = user.user_metadata.full_name ?? user.email ?? ''
  const avatarUrl = user.user_metadata.avatar_url as string | undefined
  const initial = name.charAt(0).toUpperCase() || '?'

  return avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
  ) : (
    <>{initial}</>
  )
}
```

This removes the old `AccountMenu` dropdown and `handleSignOut` (sign-out now lives on `/welcome`, Task 5).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/marketing/nav.tsx
git commit -m "feat: nav avatar links to /welcome, CTA becomes state-aware"
```

---

### Task 7: Hero CTA becomes state-aware

**Files:**
- Modify: `components/marketing/hero.tsx`

**Interfaces:**
- Consumes: `useOwnerCta` (Task 4).

- [ ] **Step 1: Import the hook**

In `components/marketing/hero.tsx`, add the import after the existing `ScrollTrigger` import (line 6):
```typescript
import { useOwnerCta } from './use-owner-cta'
```

- [ ] **Step 2: Call the hook inside the component**

Find the line `export function Hero() {` (or the component's opening — confirm the exact export name by reading the file's first component declaration) and add, as the first line of the function body:
```typescript
  const cta = useOwnerCta()
```

- [ ] **Step 3: Replace the primary CTA button and add signed-in subtext**

Replace:
```typescript
            <Link
              href="/auth"
              className="px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
            >
              Start free
            </Link>
```
with:
```typescript
            <Link
              href={cta?.href ?? '/auth'}
              className="px-8 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
            >
              {cta?.label ?? 'Start free'}
            </Link>
```

Then, immediately after the closing `</div>` of the buttons row (the `div` with `className="mt-8 flex flex-wrap items-center gap-4"`, which contains the primary and "See a live store →" links), add a subtext line that only renders when the user is signed in:
```typescript
          {cta?.subtext && (
            <p className="mt-3 text-sm text-white/50 font-body">{cta.subtext}</p>
          )}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/hero.tsx
git commit -m "feat: hero CTA becomes state-aware"
```

---

### Task 8: CTA band becomes state-aware

**Files:**
- Modify: `components/marketing/cta-band.tsx`

**Interfaces:**
- Consumes: `useOwnerCta` (Task 4).

- [ ] **Step 1: Import the hook and call it**

In `components/marketing/cta-band.tsx`, add after the `ScrollTrigger` import:
```typescript
import { useOwnerCta } from './use-owner-cta'
```
Inside `export function CtaBand() {`, add as the first line of the function body (after the `useRef` line):
```typescript
  const cta = useOwnerCta()
```

- [ ] **Step 2: Replace the button and subtext**

Replace:
```typescript
        <div data-cta-button className="mt-10">
          <Link
            href="/auth"
            className="inline-block px-10 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
          >
            Start free
          </Link>
          <p className="mt-4 text-sm text-white/40 font-body">14-day free trial · No credit card · No GST needed</p>
        </div>
```
with:
```typescript
        <div data-cta-button className="mt-10">
          <Link
            href={cta?.href ?? '/auth'}
            className="inline-block px-10 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
          >
            {cta?.label ?? 'Start free'}
          </Link>
          <p className="mt-4 text-sm text-white/40 font-body">
            {cta?.subtext ?? '14-day free trial · No credit card · No GST needed'}
          </p>
        </div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/marketing/cta-band.tsx
git commit -m "feat: CTA band becomes state-aware"
```

---

### Task 9: Pricing CTAs become state-aware

**Files:**
- Modify: `components/marketing/pricing.tsx`

**Interfaces:**
- Consumes: `useOwnerCta` (Task 4).

- [ ] **Step 1: Import the hook and call it**

In `components/marketing/pricing.tsx`, add after the `cn` import:
```typescript
import { useOwnerCta } from './use-owner-cta'
```
Inside `export function Pricing() {`, add as the first line of the function body (after the `useRef` line):
```typescript
  const cta = useOwnerCta()
```

- [ ] **Step 2: Replace the banner subtext**

Replace:
```typescript
          <p className="mt-4 inline-block px-5 py-2 rounded-full bg-success-bg border border-success-border text-sm font-medium text-fg font-body">
            Start free for 14 days — no credit card, no GST needed
          </p>
```
with:
```typescript
          <p className="mt-4 inline-block px-5 py-2 rounded-full bg-success-bg border border-success-border text-sm font-medium text-fg font-body">
            {cta?.subtext ?? 'Start free for 14 days — no credit card, no GST needed'}
          </p>
```

- [ ] **Step 3: Replace each plan card's CTA link**

Replace:
```typescript
              <Link
                href="/auth"
                className={cn(
                  'mt-8 block text-center px-6 py-3.5 rounded-full text-sm font-semibold font-body transition-opacity hover:opacity-90',
                  plan.popular
                    ? 'bg-brand-primary text-white'
                    : 'border border-fg/20 text-fg hover:bg-bg'
                )}
              >
                Start free trial
              </Link>
```
with:
```typescript
              <Link
                href={cta?.href ?? '/auth'}
                className={cn(
                  'mt-8 block text-center px-6 py-3.5 rounded-full text-sm font-semibold font-body transition-opacity hover:opacity-90',
                  plan.popular
                    ? 'bg-brand-primary text-white'
                    : 'border border-fg/20 text-fg hover:bg-bg'
                )}
              >
                {cta?.label ?? 'Start free trial'}
              </Link>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/marketing/pricing.tsx
git commit -m "feat: pricing CTAs become state-aware"
```

---

### Task 10: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Full type-check**

Run: `npx tsc --noEmit --pretty`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the new `lib/tenant-url.test.ts` and `app/actions/owner-cta.test.ts`.

- [ ] **Step 3: Manual browser check — signed out**

Start the dev server, visit the marketing homepage signed out. Confirm: nav shows "Sign in" + "Start free", hero/CTA band/pricing all show "Start free" / "Start free trial" unchanged, no subtext added anywhere.

- [ ] **Step 4: Manual browser check — signed in, onboarding incomplete**

Sign in with an account that has no tenant (or an unfinished one). Confirm: nav shows the avatar linking to `/welcome`, hero/CTA band/pricing show "Finish Setting Up" with the "Pick up where you left off" subtext where a subtext slot exists, `/welcome` shows the single "Continue setup" card linking to `/admin/onboarding`.

- [ ] **Step 5: Manual browser check — signed in, onboarded**

Complete onboarding for that account (or use an already-onboarded seed tenant). Confirm: nav/hero/CTA band/pricing show "View My Store" with "Takes you to your store & admin" subtext, `/welcome` shows both "View My Store" and "View Admin" cards, each resolving to the correct dev proxy URL (`/dev/store/{slug}` and `/dev/store/{slug}/admin`).

- [ ] **Step 6: No commit for this task** — verification only, nothing to add.
