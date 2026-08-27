import { describe, it, expect } from 'vitest'
import { apiSuccess, apiError } from './response'

describe('apiSuccess', () => {
  it('wraps the payload in a { data } envelope with a 200 default', async () => {
    const res = apiSuccess({ id: '1' })
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ data: { id: '1' } })
  })

  it('honors an explicit status', async () => {
    const res = apiSuccess({ id: '1' }, 201)
    expect(res.status).toBe(201)
  })
})

describe('apiError', () => {
  it('wraps the failure in an { error } envelope using the code default status', async () => {
    const res = apiError('unauthorized', 'missing bearer token')
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toEqual({ error: { code: 'unauthorized', message: 'missing bearer token' } })
  })

  it('maps each error code to its own default status', async () => {
    expect(apiError('forbidden', 'x').status).toBe(403)
    expect(apiError('not_found', 'x').status).toBe(404)
    expect(apiError('invalid_request', 'x').status).toBe(400)
    expect(apiError('internal_error', 'x').status).toBe(500)
  })

  it('allows overriding the default status', async () => {
    const res = apiError('invalid_request', 'bad tenant header', { status: 422 })
    expect(res.status).toBe(422)
  })

  it('omits details when not provided and includes them when it is', async () => {
    const withoutDetails = await apiError('invalid_request', 'bad input').json()
    expect(withoutDetails.error.details).toBeUndefined()
    expect('details' in withoutDetails.error).toBe(false)

    const withDetails = await apiError('invalid_request', 'bad input', {
      details: { field: 'email' },
    }).json()
    expect(withDetails.error.details).toEqual({ field: 'email' })
  })
})
