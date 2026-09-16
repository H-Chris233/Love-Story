import { describe, expect, it } from 'vitest'

import { requireAppOrigin } from '../lib/config.js'

describe('runtime configuration', () => {
  it('normalizes one valid app origin and names invalid configuration', () => {
    expect(requireAppOrigin('https://love-story-phi.vercel.app/')).toBe(
      'https://love-story-phi.vercel.app'
    )
    expect(() => requireAppOrigin('')).toThrow('APP_ORIGIN')
    expect(() => requireAppOrigin('not-a-url')).toThrow('APP_ORIGIN')
    expect(() => requireAppOrigin('https://example.com/path')).toThrow('APP_ORIGIN')
  })
})
