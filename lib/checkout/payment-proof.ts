import { uploadImage } from '@/lib/cloudinary'

/**
 * Shared payment-proof upload used by both the checkout Server Action
 * (`app/checkout/actions.ts`) and the mobile route (`app/api/v1/checkout/payment-proof`).
 */

/** Cap for a payment screenshot. Enforced on the public REST surface only — see below. */
export const MAX_PAYMENT_PROOF_BYTES = 10 * 1024 * 1024

export type PaymentProofRejection = 'missing_file' | 'not_an_image' | 'too_large'

/**
 * Validates an untrusted `multipart/form-data` field before any upstream call.
 *
 * The web Server Action does NOT call this — its only gate is the file picker's
 * `accept="image/*"` — so this deliberately stays a separate function rather than
 * being folded into `uploadPaymentProof`, keeping the existing web behaviour byte
 * for byte while the new, directly-reachable REST endpoint gets a real gate.
 *
 * Note `file.type` is client-declared and therefore advisory; it is a cheap first
 * filter, and Cloudinary's `image/upload` endpoint rejects non-images as the
 * second gate. Nothing here or downstream trusts the client-supplied filename.
 */
export function validatePaymentProofFile(file: unknown): PaymentProofRejection | null {
  if (!(file instanceof File) || file.size === 0) return 'missing_file'
  if (!file.type.startsWith('image/')) return 'not_an_image'
  if (file.size > MAX_PAYMENT_PROOF_BYTES) return 'too_large'
  return null
}

/**
 * Uploads a payment screenshot and returns its URL.
 *
 * `tenantId` must be a server-resolved tenant id (session tenant, or
 * `resolveTenantForApi`) — never a client-supplied string — since it is the only
 * thing separating one tenant's proofs from another's in the Cloudinary folder.
 *
 * Throws if Cloudinary is unconfigured or the upload fails; callers map that to
 * their own error shape.
 */
export async function uploadPaymentProof(tenantId: string, file: File): Promise<string> {
  return uploadImage(file, `talam/${tenantId}/payment-proofs`)
}
