import { requireApiUser } from '@/lib/auth-guard'
import { resolveTenantForApi } from '@/lib/tenant'
import { apiSuccess, apiError } from '@/lib/api/response'
import {
  MAX_PAYMENT_PROOF_BYTES,
  uploadPaymentProof,
  validatePaymentProofFile,
} from '@/lib/checkout/payment-proof'

const REJECTION_MESSAGE = {
  missing_file: 'A non-empty `file` field is required',
  not_an_image: 'The uploaded file must be an image',
  too_large: `The uploaded file must be at most ${MAX_PAYMENT_PROOF_BYTES} bytes`,
} as const

/**
 * Mobile counterpart of app/checkout/actions.ts's uploadPaymentProofAction, wrapping the
 * same lib/checkout/payment-proof.ts function so both surfaces stay in lockstep.
 *
 * Accepts `multipart/form-data` with a single `file` field and returns `{ url }`.
 *
 * NOT idempotent: every call uploads a new file to Cloudinary and returns a new URL. A
 * retried request therefore leaves an extra orphaned upload behind. This is harmless —
 * nothing is charged, ordered or state-changed here, and only the URL the client
 * ultimately submits with the order is ever read back — so the cost of a retry is
 * duplicate storage, not a correctness bug.
 */
export async function POST(request: Request) {
  const tenant = await resolveTenantForApi(request)
  if (!tenant) return apiError('invalid_request', 'Missing or unknown tenant')

  const user = await requireApiUser(request, tenant.id)
  if (!user) return apiError('unauthorized', 'Missing or invalid bearer token')

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return apiError('invalid_request', 'Expected a multipart/form-data body')
  }

  const file = form.get('file')
  const rejection = validatePaymentProofFile(file)
  if (rejection) return apiError('invalid_request', REJECTION_MESSAGE[rejection])
  if (!(file instanceof File)) return apiError('invalid_request', REJECTION_MESSAGE.missing_file)

  try {
    // Folder is derived from the server-resolved tenant id, never from anything the
    // client sent, so a caller can't write into another tenant's proof folder.
    const url = await uploadPaymentProof(tenant.id, file)
    return apiSuccess({ url })
  } catch {
    return apiError('internal_error', 'Upload failed. Please try again.')
  }
}
