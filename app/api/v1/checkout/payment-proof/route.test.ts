// @vitest-environment node
// This route parses a real multipart body; jsdom's File/FormData aren't the ones
// undici's Request understands, so multipart parsing only works under the node env.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockResolveTenantForApi, mockRequireApiUser, mockUploadImage } = vi.hoisted(() => ({
  mockResolveTenantForApi: vi.fn(),
  mockRequireApiUser: vi.fn(),
  mockUploadImage: vi.fn(),
}))

vi.mock('@/lib/tenant', () => ({
  resolveTenantForApi: mockResolveTenantForApi,
}))
vi.mock('@/lib/auth-guard', () => ({
  requireApiUser: mockRequireApiUser,
}))
// Only Cloudinary itself is mocked — the shared lib/checkout/payment-proof.ts validation
// and folder derivation stay real, so the tenant-isolation assertions below are meaningful.
vi.mock('@/lib/cloudinary', () => ({
  uploadImage: mockUploadImage,
}))

import { POST } from './route'
import { MAX_PAYMENT_PROOF_BYTES } from '@/lib/checkout/payment-proof'

function imageFile(bytes = 8, type = 'image/png') {
  return new File([new Uint8Array(bytes)], 'proof.png', { type })
}

function uploadRequest(headers: Record<string, string>, body?: FormData) {
  const form = body ?? new FormData()
  if (!body) form.append('file', imageFile())
  return new Request('https://api.example.com/api/v1/checkout/payment-proof', {
    method: 'POST',
    headers,
    body: form,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/v1/checkout/payment-proof', () => {
  it('uploads the file under the resolved tenant folder and returns its URL', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUploadImage.mockResolvedValue('https://res.cloudinary.com/demo/proof.png')

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { url: 'https://res.cloudinary.com/demo/proof.png' } })
    expect(mockUploadImage).toHaveBeenCalledWith(expect.any(File), 'talam/tenant-a/payment-proofs')
  })

  it('400s when the tenant cannot be resolved, without attempting auth or upload', async () => {
    mockResolveTenantForApi.mockResolvedValue(null)

    const res = await POST(uploadRequest({ authorization: 'Bearer valid-token' }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockRequireApiUser).not.toHaveBeenCalled()
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(uploadRequest({ 'x-tenant-id': 'tenant-a' }))
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body.error.code).toBe('unauthorized')
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('401s when the bearer token is invalid or expired', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue(null)

    const res = await POST(
      uploadRequest({ authorization: 'Bearer expired-token', 'x-tenant-id': 'tenant-a' })
    )

    expect(res.status).toBe(401)
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('tenant isolation: the upload folder always comes from the server-resolved tenant', async () => {
    mockRequireApiUser.mockImplementation(async (_req: Request, tenantId: string) =>
      tenantId === 'tenant-a' ? { id: 'user-1' } : null
    )
    mockUploadImage.mockResolvedValue('https://res.cloudinary.com/demo/proof.png')

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    const resA = await POST(
      uploadRequest({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-a' })
    )

    mockResolveTenantForApi.mockResolvedValueOnce({ id: 'tenant-b', slug: 'b', tier: 'trial' })
    const resB = await POST(
      uploadRequest({ authorization: 'Bearer shared-token', 'x-tenant-id': 'tenant-b' })
    )

    expect(resA.status).toBe(200)
    expect(mockUploadImage).toHaveBeenCalledWith(expect.any(File), 'talam/tenant-a/payment-proofs')
    // This token has no customer row in tenant B — the route must reject rather than
    // fall back to tenant A, and must never write into tenant B's proof folder.
    expect(resB.status).toBe(401)
    expect(mockUploadImage).not.toHaveBeenCalledWith(expect.anything(), 'talam/tenant-b/payment-proofs')
  })

  it('ignores a client-supplied tenant in the form body — the folder still uses the resolved tenant', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUploadImage.mockResolvedValue('https://res.cloudinary.com/demo/proof.png')

    const form = new FormData()
    form.append('file', imageFile())
    form.append('tenantId', 'tenant-b')
    form.append('folder', 'talam/tenant-b/payment-proofs')

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, form)
    )

    expect(res.status).toBe(200)
    expect(mockUploadImage).toHaveBeenCalledWith(expect.any(File), 'talam/tenant-a/payment-proofs')
  })

  it('400s when the file field is missing', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, new FormData())
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('400s when the file field is a plain string rather than a file', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const form = new FormData()
    form.append('file', 'https://evil.example.com/proof.png')

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, form)
    )

    expect(res.status).toBe(400)
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('400s on a non-image content type, before Cloudinary is called', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const form = new FormData()
    form.append('file', new File(['#!/bin/sh'], 'proof.sh', { type: 'application/x-sh' }))

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, form)
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.message).toMatch(/image/i)
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('400s on an oversized file, before Cloudinary is called', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })

    const form = new FormData()
    form.append('file', imageFile(MAX_PAYMENT_PROOF_BYTES + 1))

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' }, form)
    )
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error.code).toBe('invalid_request')
    expect(mockUploadImage).not.toHaveBeenCalled()
  })

  it('500s when the Cloudinary upload fails', async () => {
    mockResolveTenantForApi.mockResolvedValue({ id: 'tenant-a', slug: 'a', tier: 'trial' })
    mockRequireApiUser.mockResolvedValue({ id: 'user-1' })
    mockUploadImage.mockRejectedValue(new Error('Cloudinary upload failed: invalid signature'))

    const res = await POST(
      uploadRequest({ authorization: 'Bearer valid-token', 'x-tenant-id': 'tenant-a' })
    )
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error.code).toBe('internal_error')
    // The upstream failure text must not leak to the client.
    expect(JSON.stringify(body)).not.toMatch(/signature/i)
  })
})
