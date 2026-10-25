import { afterEach, describe, expect, it, vi } from 'vitest'
import type { QueryCtx } from '../_generated/server'
import { hasViewer, isDevBypass } from './service'

afterEach(() => vi.unstubAllEnvs())

// Only `auth.getUserIdentity` is read by the gate, so the rest of the ctx is not
// needed to exercise it.
const viewerCtx = (identity: unknown) =>
  ({ auth: { getUserIdentity: async () => identity } }) as unknown as QueryCtx

describe('isDevBypass', () => {
  it('is on only for the exact value 1', () => {
    vi.stubEnv('DEV_AUTH_BYPASS', '1')
    expect(isDevBypass()).toBe(true)

    vi.stubEnv('DEV_AUTH_BYPASS', '0')
    expect(isDevBypass()).toBe(false)

    vi.stubEnv('DEV_AUTH_BYPASS', '')
    expect(isDevBypass()).toBe(false)
  })
})

describe('hasViewer', () => {
  it('accepts a signed-in caller', async () => {
    vi.stubEnv('DEV_AUTH_BYPASS', '0')

    expect(await hasViewer(viewerCtx({ subject: 'clerk-1' }))).toBe(true)
  })

  it('rejects a signed-out caller in prod', async () => {
    vi.stubEnv('DEV_AUTH_BYPASS', '0')

    expect(await hasViewer(viewerCtx(null))).toBe(false)
  })

  it('accepts a signed-out caller on the dev bypass', async () => {
    vi.stubEnv('DEV_AUTH_BYPASS', '1')

    expect(await hasViewer(viewerCtx(null))).toBe(true)
  })
})
