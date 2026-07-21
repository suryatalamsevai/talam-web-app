# Razorpay Route Onboarding & Go-Live Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a tenant connect Razorpay via hosted (non-custodial) onboarding, track its KYC/activation status, and block "Go Live" until that status is `activated` — with the Razorpay API credentials verified live via a real QR code payment before anything else is built.

**Architecture:** A thin `lib/razorpay.ts` REST client (fetch + Basic Auth, no SDK dependency) backs three things: (1) a one-off verification script that proves the env credentials work by generating a real QR code, (2) a server action that creates a Razorpay linked account and returns a hosted onboarding URL, and (3) a webhook route that updates the tenant's stored KYC status as Razorpay verifies it. `getMissingStoreConfig`'s `payments` check becomes provider-aware: Razorpay tenants must be `activated`, everyone else keeps the existing `isOnboarded` check.

**Tech Stack:** Next.js Server Actions, Prisma (`Tenant.paymentConfig` JSON column, no migration), Vitest, native `fetch` (no `razorpay` npm package).

## Global Constraints

- Reuse `Tenant.paymentConfig` (`Json?`) for Razorpay account id + status — no schema migration (design doc: Data Model)
- No new dependency for the Razorpay API client — Razorpay's REST API works over plain HTTPS Basic Auth (design doc: Flow); use `fetch`
- `TALAM_RAZORPAY_KEY_ID` / `TALAM_RAZORPAY_KEY_SECRET` are **live-mode** keys already in `.env` — never auto-pay/scan a generated QR in code, only a human pays it (design doc: Credential Verification)
- Checkout payment capture via Route is explicitly out of scope (design doc: Scope)
- Webhook endpoint is an unauthenticated trust boundary — must verify Razorpay's signature before trusting any payload (design doc: Edge Cases)

---

### Task 1: Razorpay REST client

**Files:**
- Create: `lib/razorpay.ts`
- Test: `lib/razorpay.test.ts`

**Interfaces:**
- Consumes: `process.env.TALAM_RAZORPAY_KEY_ID`, `process.env.TALAM_RAZORPAY_KEY_SECRET`
- Produces:
  - `createQrCode(input: { amountPaise: number; description: string }): Promise<{ id: string; image_url: string; short_url: string; status: string }>`
  - `createLinkedAccount(input: { email: string; phone: string; businessName: string }): Promise<{ id: string; status: string }>`
  - `getLinkedAccount(accountId: string): Promise<{ id: string; status: string }>`
  - `RazorpayApiError` (class, thrown on non-2xx response, carries `status: number` and `body: unknown`)

- [ ] **Step 1: Write the failing test**

```ts
// lib/razorpay.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQrCode, createLinkedAccount, getLinkedAccount, RazorpayApiError } from './razorpay'

const originalFetch = global.fetch

beforeEach(() => {
  process.env.TALAM_RAZORPAY_KEY_ID = 'rzp_test_id'
  process.env.TALAM_RAZORPAY_KEY_SECRET = 'rzp_test_secret'
})

afterEach(() => {
  global.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('createQrCode', () => {
  it('posts to the qr_codes endpoint with Basic auth and returns the parsed QR', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'qr_1', image_url: 'https://rzp.io/qr_1.png', short_url: 'https://rzp.io/i/abc', status: 'active' }),
    })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await createQrCode({ amountPaise: 100, description: 'Talam credential check' })

    expect(result).toEqual({ id: 'qr_1', image_url: 'https://rzp.io/qr_1.png', short_url: 'https://rzp.io/i/abc', status: 'active' })
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.razorpay.com/v1/payments/qr_codes')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe(`Basic ${Buffer.from('rzp_test_id:rzp_test_secret').toString('base64')}`)
    expect(JSON.parse(init.body)).toEqual({ type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: 100, description: 'Talam credential check' })
  })

  it('throws RazorpayApiError on a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { description: 'Authentication failed' } }),
    }) as unknown as typeof fetch

    await expect(createQrCode({ amountPaise: 100, description: 'x' })).rejects.toThrow(RazorpayApiError)
  })
})

describe('createLinkedAccount', () => {
  it('posts to the accounts endpoint and returns id + status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'acc_1', status: 'created' }),
    }) as unknown as typeof fetch

    const result = await createLinkedAccount({ email: 'owner@store.com', phone: '9999999999', businessName: 'Priya Boutique' })
    expect(result).toEqual({ id: 'acc_1', status: 'created' })
  })
})

describe('getLinkedAccount', () => {
  it('GETs the account by id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'acc_1', status: 'activated' }) })
    global.fetch = mockFetch as unknown as typeof fetch

    const result = await getLinkedAccount('acc_1')
    expect(result).toEqual({ id: 'acc_1', status: 'activated' })
    expect(mockFetch.mock.calls[0][0]).toBe('https://api.razorpay.com/v1/accounts/acc_1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/razorpay.test.ts`
Expected: FAIL — `Cannot find module './razorpay'`

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/razorpay.ts
const BASE_URL = 'https://api.razorpay.com/v1'

export class RazorpayApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(`Razorpay API error (${status}): ${JSON.stringify(body)}`)
    this.status = status
    this.body = body
  }
}

function authHeader(): string {
  const keyId = process.env.TALAM_RAZORPAY_KEY_ID
  const keySecret = process.env.TALAM_RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) throw new Error('TALAM_RAZORPAY_KEY_ID/SECRET are not set')
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`
}

async function razorpayRequest<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: init.method,
    headers: { Authorization: authHeader(), 'Content-Type': 'application/json' },
    body: init.body ? JSON.stringify(init.body) : undefined,
  })
  const json = await response.json()
  if (!response.ok) throw new RazorpayApiError(response.status, json)
  return json as T
}

export type RazorpayQrCode = { id: string; image_url: string; short_url: string; status: string }

export function createQrCode(input: { amountPaise: number; description: string }): Promise<RazorpayQrCode> {
  return razorpayRequest<RazorpayQrCode>('/payments/qr_codes', {
    method: 'POST',
    body: { type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: input.amountPaise, description: input.description },
  })
}

export type RazorpayLinkedAccount = { id: string; status: string }

export function createLinkedAccount(input: { email: string; phone: string; businessName: string }): Promise<RazorpayLinkedAccount> {
  return razorpayRequest<RazorpayLinkedAccount>('/accounts', {
    method: 'POST',
    body: {
      email: input.email,
      phone: input.phone,
      type: 'route',
      legal_business_name: input.businessName,
      business_type: 'individual',
      contact_name: input.businessName,
      profile: { category: 'ecommerce', subcategory: 'ecommerce', addresses: {} },
    },
  })
}

export function getLinkedAccount(accountId: string): Promise<RazorpayLinkedAccount> {
  return razorpayRequest<RazorpayLinkedAccount>(`/accounts/${accountId}`, { method: 'GET' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/razorpay.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/razorpay.ts lib/razorpay.test.ts
git commit -m "feat: add Razorpay REST client (QR codes + linked accounts)"
```

---

### Task 2: Live credential verification script (the plan's success criterion)

**Files:**
- Create: `scripts/verify-razorpay-qr.ts`

**Interfaces:**
- Consumes: `createQrCode` from `lib/razorpay.ts` (Task 1)
- Produces: nothing consumed by later tasks — this is a standalone manual-verification script, not application code

- [ ] **Step 1: Write the script**

```ts
// scripts/verify-razorpay-qr.ts
import 'dotenv/config'
import { createQrCode } from '../lib/razorpay'

// ponytail: one-off manual verification script, not wired into any app flow —
// proves TALAM_RAZORPAY_KEY_ID/SECRET work against the live API before the
// Route onboarding pieces (Tasks 3-6) are built on top of them.
async function main() {
  const qr = await createQrCode({ amountPaise: 100, description: 'Talam Razorpay credential check' })
  console.log('QR code created:', qr.id)
  console.log('Status:', qr.status)
  console.log('Scan this to pay ₹1 and confirm the credentials work end-to-end:')
  console.log(qr.short_url)
  console.log('Image:', qr.image_url)
}

main().catch((error) => {
  console.error('QR generation failed:', error)
  process.exit(1)
})
```

- [ ] **Step 2: Run it against the live env keys**

Run: `npx tsx scripts/verify-razorpay-qr.ts`
Expected: prints a `short_url` / `image_url` for a real ₹1 UPI QR code (status `active`). If it throws `RazorpayApiError`, stop here and fix the credentials/API call before continuing to Task 3 — don't build the rest of the flow on unverified credentials.

- [ ] **Step 3: Manually pay the QR code**

Scan the printed `short_url` or `image_url` with a UPI app and pay the ₹1. Confirm in the [Razorpay Dashboard](https://dashboard.razorpay.com/) → Payments that a ₹1 payment settled against that QR code's `id`.

This manual confirmation is the plan's overall success criterion (design doc: Credential Verification) — once it settles, the live credentials and API wiring are proven and the remaining tasks can proceed with confidence.

- [ ] **Step 4: Commit**

```bash
git add scripts/verify-razorpay-qr.ts
git commit -m "chore: add script to verify live Razorpay credentials via test QR code"
```

---

### Task 3: Provider-aware payments check in the go-live gate

**Files:**
- Modify: `lib/data/tenant.ts:44-104` (`getMissingStoreConfig`)
- Test: Create `lib/data/tenant.test.ts`

**Interfaces:**
- Consumes: `Tenant.paymentProvider`, `Tenant.paymentConfig` (existing Prisma fields), `withTenant` from `lib/prisma`
- Produces: `RazorpayPaymentConfig` type (exported from `lib/data/tenant.ts`) — `{ provider: 'razorpay'; accountId: string; status: 'pending' | 'needs_clarification' | 'activated' | 'rejected'; updatedAt: string }`, consumed by Task 4 (writes it) and Task 5 (updates it)

- [ ] **Step 1: Write the failing test**

```ts
// lib/data/tenant.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({
      tenant: { findUnique: vi.fn() },
      product: { count: vi.fn() },
    })
  ),
}))

import { withTenant } from '@/lib/prisma'
import { getMissingStoreConfig } from './tenant'

function mockTenant(overrides: Record<string, unknown>) {
  const db = {
    tenant: {
      findUnique: vi.fn().mockResolvedValue({
        isOnboarded: true,
        paymentProvider: 'upi_manual',
        paymentConfig: null,
        contactPhone: '9999999999',
        contactEmail: 'a@b.com',
        about: { description: 'We make things' },
        branches: [{ address: '123 Road', city: 'Bengaluru' }],
        ...overrides,
      }),
    },
    product: { count: vi.fn().mockResolvedValue(3) },
  }
  vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
  return db
}

beforeEach(() => vi.clearAllMocks())

describe('getMissingStoreConfig — payments check', () => {
  it('passes non-razorpay providers based on isOnboarded (unchanged behavior)', async () => {
    mockTenant({ paymentProvider: 'upi_manual', isOnboarded: true })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })

  it('flags razorpay as missing when paymentConfig is null', async () => {
    mockTenant({ paymentProvider: 'razorpay', paymentConfig: null })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments' })
  })

  it('flags razorpay as missing when status is pending', async () => {
    mockTenant({ paymentProvider: 'razorpay', paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'pending', updatedAt: '2026-07-21T00:00:00.000Z' } })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toMatchObject({ key: 'payments' })
  })

  it('clears razorpay once status is activated', async () => {
    mockTenant({ paymentProvider: 'razorpay', paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'activated', updatedAt: '2026-07-21T00:00:00.000Z' } })
    const missing = await getMissingStoreConfig('tenant-1')
    expect(missing.find((m) => m.key === 'payments')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/data/tenant.test.ts`
Expected: FAIL — the `paymentConfig`/`paymentProvider`-based cases fail because the current check only reads `isOnboarded`

- [ ] **Step 3: Implement the provider-aware check**

In `lib/data/tenant.ts`, add the exported type near the top (after `SocialLink`):

```ts
export type RazorpayPaymentConfig = {
  provider: 'razorpay'
  accountId: string
  status: 'pending' | 'needs_clarification' | 'activated' | 'rejected'
  updatedAt: string
}
```

Update the `db.tenant.findUnique` select in `getMissingStoreConfig` to also fetch `paymentProvider: true, paymentConfig: true`, and replace the `payments` check:

```ts
  const missing: MissingConfigItem[] = []
  // ponytail: no persisted "payment configured" flag exists yet (paymentProvider always has
  // a default, and nothing writes paymentConfig) — the onboarding wizard forces a payment
  // choice, so isOnboarded is the best available signal. Revisit once Payments settings are
  // actually saveable after onboarding.
  const razorpayConfig = tenant.paymentConfig as RazorpayPaymentConfig | null
  const paymentsOk =
    tenant.paymentProvider === 'razorpay' ? razorpayConfig?.status === 'activated' : tenant.isOnboarded
  if (!paymentsOk)
    missing.push({
      key: 'payments',
      label: 'Payments',
      description:
        tenant.paymentProvider === 'razorpay'
          ? 'Finish Razorpay verification (KYC pending)'
          : 'Choose and enable a payment method',
      href: '/admin/settings?tab=Payments',
    })
```

(Leave the existing `// ponytail:` comment above it as-is — it still explains why `isOnboarded` is the fallback signal for non-Razorpay providers.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/data/tenant.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/data/tenant.ts lib/data/tenant.test.ts
git commit -m "feat: make go-live payments check provider-aware for Razorpay"
```

---

### Task 4: Linked account onboarding server action

**Files:**
- Modify: `app/admin/settings/actions.ts`
- Test: Create `app/admin/settings/actions.test.ts` (if it doesn't already exist — check first; if it exists, add to it instead of overwriting)

**Interfaces:**
- Consumes: `createLinkedAccount`, `getLinkedAccount` from `lib/razorpay.ts` (Task 1), `RazorpayPaymentConfig` type from `lib/data/tenant.ts` (Task 3), `requireOwnerTenant` from `lib/admin-guard`, `withTenant` from `lib/prisma`
- Produces: `startRazorpayOnboardingAction(): Promise<{ onboardingUrl: string } | { error: string }>`, `getPaymentSettingsAction(): Promise<{ provider: string; razorpay: RazorpayPaymentConfig | null }>`, and `refreshRazorpayStatusAction(): Promise<{ status: RazorpayPaymentConfig['status'] } | { error: string }>` — all consumed by Task 6 (Payments tab UI)

- [ ] **Step 1: Write the failing test**

```ts
// append to app/admin/settings/actions.test.ts (create if missing, matching the
// mocking pattern used in app/admin/onboarding/actions.test.ts)
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/admin-guard', () => ({
  requireOwnerTenant: vi.fn().mockResolvedValue({ userId: 'user-1', tenantId: 'tenant-1' }),
}))

vi.mock('@/lib/razorpay', () => ({
  createLinkedAccount: vi.fn(),
  getLinkedAccount: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  withTenant: vi.fn((_tenantId: string, fn: (db: unknown) => unknown) =>
    fn({ tenant: { findUnique: vi.fn(), update: vi.fn() } })
  ),
}))

import { withTenant } from '@/lib/prisma'
import { createLinkedAccount, getLinkedAccount } from '@/lib/razorpay'
import { startRazorpayOnboardingAction, refreshRazorpayStatusAction } from './actions'

beforeEach(() => vi.clearAllMocks())

describe('startRazorpayOnboardingAction', () => {
  it('creates a linked account, stores pending status, and returns the onboarding URL', async () => {
    const db = { tenant: { findUnique: vi.fn().mockResolvedValue({ name: 'Priya Boutique', contactEmail: 'a@b.com', contactPhone: '9999999999' }), update: vi.fn() } }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
    vi.mocked(createLinkedAccount).mockResolvedValue({ id: 'acc_1', status: 'created' })

    const result = await startRazorpayOnboardingAction()

    expect(result).toEqual({ onboardingUrl: 'https://dashboard.razorpay.com/onboarding/acc_1' })
    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tenant-1' },
        data: expect.objectContaining({
          paymentProvider: 'razorpay',
          paymentConfig: expect.objectContaining({ provider: 'razorpay', accountId: 'acc_1', status: 'pending' }),
        }),
      })
    )
  })

  it('returns an error when the tenant has no contact email/phone yet', async () => {
    const db = { tenant: { findUnique: vi.fn().mockResolvedValue({ name: 'Priya', contactEmail: null, contactPhone: null }), update: vi.fn() } }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))

    const result = await startRazorpayOnboardingAction()
    expect(result).toEqual({ error: 'Add a contact phone and email before connecting Razorpay.' })
    expect(createLinkedAccount).not.toHaveBeenCalled()
  })
})

describe('refreshRazorpayStatusAction', () => {
  it('fetches the linked account from Razorpay and persists the latest status', async () => {
    const db = {
      tenant: {
        findUnique: vi.fn().mockResolvedValue({ paymentConfig: { provider: 'razorpay', accountId: 'acc_1', status: 'pending', updatedAt: '2026-07-21T00:00:00.000Z' } }),
        update: vi.fn(),
      },
    }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))
    vi.mocked(getLinkedAccount).mockResolvedValue({ id: 'acc_1', status: 'activated' })

    const result = await refreshRazorpayStatusAction()

    expect(result).toEqual({ status: 'activated' })
    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'activated' }) }) })
    )
  })

  it('returns an error when the tenant has no Razorpay account yet', async () => {
    const db = { tenant: { findUnique: vi.fn().mockResolvedValue({ paymentConfig: null }), update: vi.fn() } }
    vi.mocked(withTenant).mockImplementation((_tenantId, fn) => Promise.resolve(fn(db)))

    const result = await refreshRazorpayStatusAction()
    expect(result).toEqual({ error: 'No Razorpay account connected yet.' })
    expect(getLinkedAccount).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/admin/settings/actions.test.ts`
Expected: FAIL — `startRazorpayOnboardingAction`/`refreshRazorpayStatusAction` not exported yet

- [ ] **Step 3: Implement the action**

Add to `app/admin/settings/actions.ts`:

```ts
import { revalidatePath } from 'next/cache'
import { requireOwnerTenant } from '@/lib/admin-guard'
import { withTenant } from '@/lib/prisma'
import { createLinkedAccount, getLinkedAccount } from '@/lib/razorpay'
import type { RazorpayPaymentConfig } from '@/lib/data/tenant'

export async function getPaymentSettingsAction(): Promise<{ provider: string; razorpay: RazorpayPaymentConfig | null }> {
  const { tenantId } = await requireOwnerTenant()
  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentProvider: true, paymentConfig: true } })
  )
  return { provider: tenant?.paymentProvider ?? 'upi_manual', razorpay: (tenant?.paymentConfig as RazorpayPaymentConfig | null) ?? null }
}

export async function startRazorpayOnboardingAction(): Promise<{ onboardingUrl: string } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { name: true, contactEmail: true, contactPhone: true } })
  )
  if (!tenant?.contactEmail?.trim() || !tenant?.contactPhone?.trim()) {
    return { error: 'Add a contact phone and email before connecting Razorpay.' }
  }

  const account = await createLinkedAccount({ email: tenant.contactEmail, phone: tenant.contactPhone, businessName: tenant.name })

  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: account.id,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  }
  await withTenant(tenantId, (db) =>
    db.tenant.update({ where: { id: tenantId }, data: { paymentProvider: 'razorpay', paymentConfig } })
  )

  revalidatePath('/admin/settings')
  return { onboardingUrl: `https://dashboard.razorpay.com/onboarding/${account.id}` }
}

export async function refreshRazorpayStatusAction(): Promise<{ status: RazorpayPaymentConfig['status'] } | { error: string }> {
  const { tenantId } = await requireOwnerTenant()

  const tenant = await withTenant(tenantId, (db) =>
    db.tenant.findUnique({ where: { id: tenantId }, select: { paymentConfig: true } })
  )
  const existing = tenant?.paymentConfig as RazorpayPaymentConfig | null
  if (!existing?.accountId) return { error: 'No Razorpay account connected yet.' }

  const account = await getLinkedAccount(existing.accountId)
  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: existing.accountId,
    status: account.status as RazorpayPaymentConfig['status'],
    updatedAt: new Date().toISOString(),
  }
  await withTenant(tenantId, (db) => db.tenant.update({ where: { id: tenantId }, data: { paymentConfig } }))

  revalidatePath('/admin/settings')
  return { status: paymentConfig.status }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run app/admin/settings/actions.test.ts`
Expected: PASS (4 new tests)

- [ ] **Step 5: Commit**

```bash
git add app/admin/settings/actions.ts app/admin/settings/actions.test.ts
git commit -m "feat: add Razorpay linked-account onboarding server action"
```

---

### Task 5: Webhook handler for KYC status updates

**Files:**
- Create: `lib/razorpay-webhook.ts` (pure, testable event-handling logic)
- Create: `app/api/webhooks/razorpay/route.ts` (thin Next.js route wrapper)
- Test: `lib/razorpay-webhook.test.ts`

**Interfaces:**
- Consumes: `RazorpayPaymentConfig` type from `lib/data/tenant.ts` (Task 3), `prisma` from `lib/prisma`
- Produces: `verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean`, `handleRazorpayAccountEvent(payload: { event: string; account_id: string }): Promise<void>` — both used only by `route.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/razorpay-webhook.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

vi.mock('@/lib/prisma', () => ({
  prisma: { tenant: { updateMany: vi.fn() } },
}))

import { prisma } from '@/lib/prisma'
import { verifyRazorpaySignature, handleRazorpayAccountEvent } from './razorpay-webhook'

beforeEach(() => vi.clearAllMocks())

describe('verifyRazorpaySignature', () => {
  it('accepts a signature computed with the correct secret', () => {
    const body = '{"event":"account.activated"}'
    const secret = 'whsec_test'
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex')
    expect(verifyRazorpaySignature(body, signature, secret)).toBe(true)
  })

  it('rejects a wrong signature', () => {
    expect(verifyRazorpaySignature('{"event":"x"}', 'deadbeef', 'whsec_test')).toBe(false)
  })
})

describe('handleRazorpayAccountEvent', () => {
  it('updates the matching tenant to activated on account.activated', async () => {
    await handleRazorpayAccountEvent({ event: 'account.activated', account_id: 'acc_1' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith({
      where: { paymentConfig: { path: ['accountId'], equals: 'acc_1' } },
      data: { paymentConfig: expect.objectContaining({ status: 'activated', accountId: 'acc_1' }) },
    })
  })

  it('maps account.under_review to pending and account.rejected to rejected', async () => {
    await handleRazorpayAccountEvent({ event: 'account.under_review', account_id: 'acc_2' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'pending' }) }) })
    )

    await handleRazorpayAccountEvent({ event: 'account.rejected', account_id: 'acc_3' })
    expect(prisma.tenant.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentConfig: expect.objectContaining({ status: 'rejected' }) }) })
    )
  })

  it('ignores unrecognized events without touching the database', async () => {
    await handleRazorpayAccountEvent({ event: 'payment.captured', account_id: 'acc_1' })
    expect(prisma.tenant.updateMany).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run lib/razorpay-webhook.test.ts`
Expected: FAIL — `Cannot find module './razorpay-webhook'`

- [ ] **Step 3: Implement**

```ts
// lib/razorpay-webhook.ts
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { RazorpayPaymentConfig } from '@/lib/data/tenant'

export function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

const EVENT_TO_STATUS: Record<string, RazorpayPaymentConfig['status']> = {
  'account.activated': 'activated',
  'account.under_review': 'pending',
  'account.needs_clarification': 'needs_clarification',
  'account.rejected': 'rejected',
}

export async function handleRazorpayAccountEvent(payload: { event: string; account_id: string }): Promise<void> {
  const status = EVENT_TO_STATUS[payload.event]
  if (!status) return

  const paymentConfig: RazorpayPaymentConfig = {
    provider: 'razorpay',
    accountId: payload.account_id,
    status,
    updatedAt: new Date().toISOString(),
  }
  await prisma.tenant.updateMany({
    where: { paymentConfig: { path: ['accountId'], equals: payload.account_id } },
    data: { paymentConfig },
  })
}
```

```ts
// app/api/webhooks/razorpay/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { verifyRazorpaySignature, handleRazorpayAccountEvent } from '@/lib/razorpay-webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret || !signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody) as { event: string; account_id: string }
  await handleRazorpayAccountEvent(payload)

  return NextResponse.json({ ok: true })
}
```

Note: `Tenant.paymentConfig` is queried with a JSON path filter (`updateMany` + `path`) — this only ever matches at most one tenant per `accountId` since account ids are unique per linked account, so `updateMany` here is a safe "update the one match if it exists" rather than a bulk operation.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run lib/razorpay-webhook.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Add the webhook secret placeholder to `.env.example`**

Add `RAZORPAY_WEBHOOK_SECRET=` under the `TALAM_RAZORPAY_KEY_SECRET=` line in `.env.example`. (Do not add a value to `.env` — this comes from configuring the webhook in the Razorpay dashboard, a business/ops step outside this plan.)

- [ ] **Step 6: Commit**

```bash
git add lib/razorpay-webhook.ts lib/razorpay-webhook.test.ts app/api/webhooks/razorpay/route.ts .env.example
git commit -m "feat: handle Razorpay account webhooks to track KYC status"
```

---

### Task 6: Wire the Payments Settings tab to real Razorpay status

**Files:**
- Modify: `app/admin/settings/page.tsx:516-591` (`PaymentsTab`)

**Interfaces:**
- Consumes: `getPaymentSettingsAction`, `startRazorpayOnboardingAction`, `refreshRazorpayStatusAction` from `./actions` (Task 4)
- Produces: nothing consumed by other tasks (leaf UI task)

- [ ] **Step 1: Replace the Razorpay block's local mock state with live data**

In `app/admin/settings/page.tsx`, update the imports at the top of the file:

```ts
import { getAboutAction, updateAboutAction, getContactSettingsAction, updateContactSettingsAction, getPaymentSettingsAction, startRazorpayOnboardingAction, refreshRazorpayStatusAction } from './actions'
```

Replace the `PaymentsTab` function body (keep the UPI/Instamojo blocks and the pending-orders banner untouched — only the Razorpay block changes):

```tsx
function PaymentsTab() {
  const [upiEnabled, setUpiEnabled] = useState(true)
  const [instamojoEnabled, setInstamojoEnabled] = useState(false)
  const [razorpayStatus, setRazorpayStatus] = useState<'upi_manual' | 'pending' | 'needs_clarification' | 'activated' | 'rejected'>('upi_manual')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getPaymentSettingsAction().then(({ provider, razorpay }) => {
      if (provider === 'razorpay' && razorpay) setRazorpayStatus(razorpay.status)
    })
  }, [])

  const handleConnect = useCallback(async () => {
    setConnecting(true)
    setError('')
    const result = await startRazorpayOnboardingAction()
    setConnecting(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setRazorpayStatus('pending')
    window.open(result.onboardingUrl, '_blank')
  }, [])

  const statusLabel: Record<typeof razorpayStatus, string> = {
    upi_manual: 'Not connected',
    pending: 'Verification pending',
    needs_clarification: 'Needs more info',
    activated: 'Activated',
    rejected: 'Rejected',
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ...unchanged pending-orders banner and intro paragraph... */}

      <div className="flex flex-col gap-4">
        {/* ...unchanged UPI block... */}
        {/* ...unchanged Instamojo block... */}

        <div className="rounded-lg border border-border p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-14 items-center justify-center rounded-lg bg-[#072654] text-[9px] font-bold text-surface">RZRPAY</span>
              <div>
                <p className="text-md font-semibold text-fg">Razorpay</p>
                <p className="text-xs text-muted-warm">2% per transaction · Card, UPI, netbanking · KYC via Razorpay</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-2xs font-semibold ${razorpayStatus === 'activated' ? 'bg-success-bg text-success' : 'bg-[#FEF3C7] text-[#92400E]'}`}>
                {statusLabel[razorpayStatus]}
              </span>
              {razorpayStatus === 'upi_manual' && (
                <button type="button" onClick={handleConnect} disabled={connecting} className="rounded-lg bg-brand-primary px-3 py-2 text-sm font-semibold text-surface disabled:opacity-50">
                  {connecting ? 'Connecting…' : 'Connect Razorpay'}
                </button>
              )}
              {(razorpayStatus === 'pending' || razorpayStatus === 'needs_clarification') && (
                <button
                  type="button"
                  onClick={async () => {
                    const result = await refreshRazorpayStatusAction()
                    if ('error' in result) setError(result.error)
                    else setRazorpayStatus(result.status)
                  }}
                  className="text-sm font-semibold text-fg underline"
                >
                  Refresh status
                </button>
              )}
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
        </div>
      </div>

      <p className="text-center text-xs text-muted-warm">🔒 Settings are locked while you have pending orders.</p>
    </div>
  )
}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`, sign in as a seeded tenant owner, go to `/admin/settings?tab=Payments`.
Expected: Razorpay card shows "Not connected" with a "Connect Razorpay" button; clicking it calls the action, shows "Verification pending", and opens the onboarding URL in a new tab. (Full KYC completion can't be tested without a live Razorpay Partner account per the design doc — this only verifies the button wiring and status display.)

- [ ] **Step 3: Commit**

```bash
git add app/admin/settings/page.tsx
git commit -m "feat: wire Payments settings Razorpay card to live onboarding status"
```

---

### Task 7: Full test suite pass

- [ ] **Step 1: Run the full test suite**

Run: `npm run test:run`
Expected: all tests pass, including the 4 new/modified files from Tasks 1, 3, 4, 5

- [ ] **Step 2: Confirm Task 2's manual verification is done**

Confirm the ₹1 QR payment from Task 2 settled in the Razorpay Dashboard. If not done yet, do it now — it's the plan's completion criterion per the design doc.

- [ ] **Step 3: Commit (if any fixups were needed)**

```bash
git add -A
git commit -m "test: fix up any failures found in full suite run"
```
