import { withTenant } from '@/lib/prisma'
import { verifyRazorpaySignature } from '@/lib/payments/razorpay'

/**
 * Shared core of the Razorpay checkout-callback verification, used by both
 * `verifyRazorpayPaymentAction` (web, session or guest-cookie ownership) and
 * `POST /api/v1/checkout/razorpay/verify` (mobile, bearer-token ownership).
 *
 * Ownership resolution deliberately stays with the caller: the web action may
 * accept a guest-order cookie, the API only ever accepts the bearer-authenticated
 * user. This function is handed an already-resolved `customerId` and re-asserts it
 * in the `where` clause so a mismatched customer can never mutate payment state.
 *
 * Idempotent / retry-safe: the update is an `updateMany` that re-asserts the same
 * terminal state (`paid` / `confirmed`) for the same payment id. A repeated call
 * with the same verified payload writes the same values again and is a safe no-op;
 * there is no counter, no state machine transition, and no side effect to double up.
 *
 * The Razorpay webhook remains the single source of truth for payment state — this
 * path is only the client-side confirmation that lets the shopper's UI move on.
 */

export type VerifyRazorpayPaymentInput = {
  tenantId: string
  /** Already-resolved owner of the order — never taken from client input. */
  customerId: string
  orderId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  signature: string
}

export type VerifyRazorpayPaymentResult =
  | { ok: true; updated: number }
  | { ok: false; reason: 'invalid_signature' }

export async function verifyRazorpayPayment(
  input: VerifyRazorpayPaymentInput
): Promise<VerifyRazorpayPaymentResult> {
  if (
    !verifyRazorpaySignature({
      razorpayOrderId: input.razorpayOrderId,
      razorpayPaymentId: input.razorpayPaymentId,
      signature: input.signature,
    })
  ) {
    // Never touch the database on an unverified signature.
    return { ok: false, reason: 'invalid_signature' }
  }

  const { count } = await withTenant(input.tenantId, (db) =>
    db.order.updateMany({
      where: {
        id: input.orderId,
        tenantId: input.tenantId,
        customerId: input.customerId,
        // Binds this verification to the Razorpay order actually minted for this order row
        // (set by createRazorpayOrderForOrder). Razorpay keys are shared across every tenant
        // on this platform, so a signature is only proof of *a* genuine payment somewhere —
        // without this, a signature earned on one order could be replayed to confirm any
        // other pending order, for any amount, in any tenant.
        paymentId: input.razorpayOrderId,
        paymentStatus: 'pending',
      },
      data: { paymentStatus: 'paid', paymentId: input.razorpayPaymentId, status: 'confirmed' },
    })
  )

  if (count > 0) return { ok: true, updated: count }

  // Nothing pending matched. Distinguish "already verified by an earlier call with this
  // exact payment" (retry-safe no-op — `count` above is 0 on a retry precisely because the
  // first call already flipped `paymentStatus` off `pending`) from every other case: wrong
  // order, wrong tenant/customer, or a signature that doesn't correspond to what was actually
  // created for this order. Only the former may report success.
  const alreadyVerified = await withTenant(input.tenantId, (db) =>
    db.order.findFirst({
      where: {
        id: input.orderId,
        tenantId: input.tenantId,
        customerId: input.customerId,
        paymentId: input.razorpayPaymentId,
        paymentStatus: 'paid',
      },
      select: { id: true },
    })
  )

  // `updated === 0` means the order doesn't exist, belongs to another tenant/customer, or
  // this signature doesn't match what was created for it — callers decide how loudly to
  // report that.
  return { ok: true, updated: alreadyVerified ? 1 : 0 }
}
