import { NextResponse } from 'next/server'

/**
 * Versioning convention for the mobile-consumable REST API.
 *
 * All endpoints live under `app/api/v1/**`. A breaking change to a v1 response
 * shape ships as `app/api/v2/**` alongside the still-live v1 routes, rather than
 * mutating v1 in place — already-shipped mobile clients pin to a version and
 * must keep working. New endpoints and additive (non-breaking) fields are safe
 * to add to v1 directly.
 *
 * Every `app/api/v1/**` route responds with one of the two envelopes below —
 * `{ data }` on success, `{ error: { code, message } }` on failure — so a
 * mobile client can branch on response shape alone without inspecting the
 * HTTP status first.
 */

export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'invalid_request'
  | 'internal_error'

export type ApiSuccessBody<T> = {
  data: T
}

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode
    message: string
    details?: unknown
  }
}

// Default HTTP status per error code, used when a call site doesn't need to override it.
const DEFAULT_STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  invalid_request: 400,
  internal_error: 500,
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status })
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  options?: { status?: number; details?: unknown }
): NextResponse<ApiErrorBody> {
  const status = options?.status ?? DEFAULT_STATUS_BY_CODE[code]
  const details = options?.details

  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  )
}
