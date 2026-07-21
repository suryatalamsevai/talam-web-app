# Razorpay Route Onboarding & Go-Live Gate — Design

## Goal

Let a tenant connect Razorpay as a payment method without Talam ever handling
their bank details or KYC documents, and block "Go Live" until Razorpay
onboarding is actually verified — not just "selected."

## Background

`getMissingStoreConfig` (`lib/data/tenant.ts:44`) gates the "Go Live" action
on 5 checks. The `payments` check currently just reads `tenant.isOnboarded`,
which is true once the onboarding wizard is completed — regardless of which
payment provider was picked or whether it actually works. A tenant can select
Razorpay in the wizard and go live with no working payment method.

Decision from discussion: don't build a Talam-managed payout system (bank
account fields, EOD payout job, fee calculation). Use **Razorpay Route's
hosted onboarding** — Razorpay owns KYC, bank verification, and payout; Talam
just tracks activation status.

## Scope

**In scope:**
- Payments Settings tab: trigger Razorpay linked-account onboarding, show live status
- Webhook endpoint to receive Razorpay account status updates
- `payments` check in `getMissingStoreConfig` becomes provider-aware
- Manual "recheck status" fallback if a webhook is missed

**Out of scope (follow-up work, not this plan):**
- Actually capturing customer payments through Razorpay Route at checkout
  (splitting the transferred amount) — this design only covers onboarding
  and the go-live gate. Checkout integration is a separate design.
- Instamojo — left as-is (still gated by `isOnboarded` only)
- Talam's own Razorpay Partner account setup — business/ops prerequisite,
  not application code. This plan assumes `RAZORPAY_KEY_ID`,
  `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET` exist as env vars.

## Data Model

No migration needed. Reuse the existing `Tenant.paymentConfig` `Json?`
column (`prisma/schema.prisma:77`), currently unused:

```ts
type RazorpayPaymentConfig = {
  provider: 'razorpay'
  accountId: string
  status: 'pending' | 'needs_clarification' | 'activated' | 'rejected'
  updatedAt: string // ISO
}
```

## Flow

1. **Tenant selects Razorpay** in Settings → Payments tab (`PaymentsTab` in
   `app/admin/settings/page.tsx:517`, currently local `useState` mockup —
   becomes a real server action).
2. Server action calls Razorpay's Account API to create a linked-account
   stub, gets back a co-branded onboarding URL, saves
   `{ status: 'pending', accountId }` to `paymentConfig`, and opens the URL
   for the tenant.
3. Tenant completes KYC (PAN, bank details, business proof) entirely on
   Razorpay's hosted form. **Talam's DB never stores this data.**
4. Razorpay verifies asynchronously and POSTs a webhook
   (`account.activated` / `account.under_review` /
   `account.needs_clarification` / `account.rejected`) to a new route:
   `app/api/webhooks/razorpay/route.ts`.
5. Webhook handler verifies the Razorpay signature, looks up the tenant by
   `accountId`, and updates `paymentConfig.status`.
6. Payments Settings tab shows the current status as a badge (Pending /
   Needs Info / Rejected / Activated) instead of a toggle, polling or
   re-fetching on page load.
7. **`getMissingStoreConfig` payments check:**
   ```ts
   if (tenant.paymentProvider === 'razorpay') {
     missing if paymentConfig?.status !== 'activated'
   } else {
     missing if !tenant.isOnboarded   // unchanged for upi_manual/instamojo
   }
   ```
   `goLiveAction` (`app/admin/dashboard/actions.ts:29`) needs no change —
   it already just calls `getMissingStoreConfig` and blocks on any entry.

## Edge Cases

- **Missed webhook:** add a "Refresh status" button on the Payments tab that
  calls Razorpay's fetch-account API directly as a fallback — don't build
  polling infrastructure for this.
- **Switching provider after activation:** keep the stored `paymentConfig`
  record; only the active `paymentProvider` determines what the go-live
  check evaluates.
- **Webhook signature invalid:** reject with 400, do not update status —
  this is a trust boundary (unauthenticated inbound endpoint).

## Testing

- Unit test the provider-aware branch in `getMissingStoreConfig` (razorpay
  pending/activated/rejected, and unchanged upi_manual/instamojo behavior).
- Unit test webhook signature verification (valid/invalid/missing signature).
- Full onboarding redirect can't be exercised end-to-end without live
  Razorpay Partner credentials — flag as manual QA once those exist.
