import { describe, expect, it } from 'vitest'
import { getAdminUrl, getStoreUrl, isSafeRedirectTarget } from './tenant-url'

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
    expect(getAdminUrl('priya-boutique', true)).toBe('/dev/store/priya-boutique/admin/dashboard')
  })

  it('returns the subdomain admin URL in prod', () => {
    expect(getAdminUrl('priya-boutique', false)).toBe('https://priya-boutique.talam4shop.com/admin/dashboard')
  })
})

describe('isSafeRedirectTarget', () => {
  const base = 'https://myapp.example.com/auth/callback'

  it('accepts a plain relative path', () => {
    expect(isSafeRedirectTarget('/admin/onboarding', base)).toBe(true)
  })

  it('rejects null/undefined', () => {
    expect(isSafeRedirectTarget(null, base)).toBe(false)
    expect(isSafeRedirectTarget(undefined, base)).toBe(false)
  })

  it('rejects a value that does not start with a slash', () => {
    expect(isSafeRedirectTarget('evil.example', base)).toBe(false)
  })

  it('rejects an absolute URL to another origin', () => {
    expect(isSafeRedirectTarget('https://evil.example', base)).toBe(false)
  })

  it('rejects a protocol-relative URL', () => {
    expect(isSafeRedirectTarget('//evil.example', base)).toBe(false)
  })

  it('rejects a backslash-prefixed path (normalizes to protocol-relative)', () => {
    expect(isSafeRedirectTarget('/\\evil.example', base)).toBe(false)
  })

  it('rejects userinfo-syntax tricks', () => {
    expect(isSafeRedirectTarget('/@evil.example', base)).toBe(true) // stays a path segment, not a host
    expect(isSafeRedirectTarget('//evil.example/@x', base)).toBe(false)
  })
})
