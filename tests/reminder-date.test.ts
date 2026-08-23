import { describe, expect, it } from 'vitest'

import { getNextAnniversary } from '../lib/reminders.js'

describe('getNextAnniversary', () => {
  it('uses February 28 for a leap-day anniversary in a non-leap year', () => {
    expect(getNextAnniversary('2024-02-29', '2025-02-01')).toBe('2025-02-28')
  })
})
