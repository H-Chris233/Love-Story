import { describe, expect, it } from 'vitest'

import { createReminderService } from '../lib/reminders.js'
import { createMemoryStore } from '../lib/store/memory.js'
import { createRecordingMailer } from '../lib/testing/recording-mailer.js'

describe('ReminderService', () => {
  it('uses the Shanghai calendar and delivers each reminder to both members once', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    store.addPartnerForTest(owner.space.id, {
      displayName: '阿川',
      email: 'partner@example.com'
    })
    await store.createAnniversary({
      space: owner.space,
      author: owner.user,
      title: '第一次旅行',
      originalDate: '2024-01-08',
      reminderDays: 7,
      visibility: 'private',
      slug: 'first-trip',
      now: new Date('2026-08-23T00:00:00.000Z')
    })
    const mailer = createRecordingMailer()
    const reminders = createReminderService({ store, mailer })
    const now = new Date('2026-12-31T23:00:00.000Z')

    await reminders.run(now)
    await reminders.run(now)
    const anniversaryDay = new Date('2027-01-07T23:00:00.000Z')
    await reminders.run(anniversaryDay)
    await reminders.run(anniversaryDay)

    expect(mailer.messages).toHaveLength(4)
    expect(mailer.messages.map(({ to }) => to).sort()).toEqual([
      'owner@example.com',
      'owner@example.com',
      'partner@example.com',
      'partner@example.com'
    ])
    expect(mailer.messages.every(({ idempotencyKey }) => idempotencyKey)).toBe(true)
  })
})
