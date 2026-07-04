import { describe, it, expect, vi } from 'vitest'

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

describe('Supabase browser client', () => {
  it('exports createBrowserClient factory', async () => {
    const { createBrowserClient } = await import('./client')
    expect(createBrowserClient).toBeDefined()
    expect(typeof createBrowserClient).toBe('function')
  })
})
