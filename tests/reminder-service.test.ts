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
    expect(mailer.messages.every(({ html }) => html.includes('<!doctype html>'))).toBe(true)
    expect(mailer.messages[0].html).toContain('第一次旅行 · 还有 7 天')
    expect(mailer.messages[2].html).toContain('第一次旅行 · 就是今天')
    expect(mailer.messages.every(({ html }) => html.includes('2027-01-08（北京时间）'))).toBe(true)
    expect(mailer.messages.map(({ to }) => to).sort()).toEqual([
      'owner@example.com',
      'owner@example.com',
      'partner@example.com',
      'partner@example.com'
    ])
    expect(mailer.messages.every(({ idempotencyKey }) => idempotencyKey)).toBe(true)
  })

  it('tries a failed Cron delivery three times with the original message', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-09-16T00:00:00.000Z')
    })
    await store.createAnniversary({
      space: owner.space,
      author: owner.user,
      title: '今天',
      originalDate: '2026-09-16',
      reminderDays: 7,
      visibility: 'private',
      slug: 'today',
      now: new Date('2026-09-16T00:00:00.000Z')
    })
    const messages: string[] = []
    const reminders = createReminderService({
      store,
      mailer: {
        async send(message) {
          messages.push(JSON.stringify(message))
          throw new Error('temporary')
        }
      },
      sleep: async () => {}
    })

    expect(await reminders.run(new Date('2026-09-16T00:00:00.000Z'))).toMatchObject({
      sent: 0,
      failed: 1,
      needsReview: 0
    })
    expect(messages).toHaveLength(3)
    expect(new Set(messages).size).toBe(1)
  })

  it('requires duplicate-risk confirmation after 23 hours and clears a successful retry', async () => {
    const store = createMemoryStore()
    const owner = await store.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      passwordHash: 'unused',
      now: new Date('2026-09-16T00:00:00.000Z')
    })
    const anniversary = await store.createAnniversary({
      space: owner.space,
      author: owner.user,
      title: '今天',
      originalDate: '2026-09-16',
      reminderDays: 7,
      visibility: 'private',
      slug: 'today',
      now: new Date('2026-09-16T00:00:00.000Z')
    })
    const now = new Date('2026-09-16T00:00:00.000Z')
    const key = {
      anniversaryId: anniversary.id,
      userId: owner.user.id,
      occurrenceDate: '2026-09-16',
      kind: 'today' as const
    }
    await store.enqueueDelivery(
      key,
      {
        to: owner.user.email,
        subject: '标题',
        html: '正文',
        kind: 'anniversary-reminder',
        idempotencyKey: 'stable'
      },
      now
    )
    const lease = await store.claimDelivery(key, now)
    await store.finishDelivery(key, { error: 'failed' }, now, lease!)
    const mailer = createRecordingMailer()
    const reminders = createReminderService({ store, mailer })
    const later = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const [issue] = await reminders.status(owner.user, owner.space, later)
    expect(issue.status).toBe('needsReview')
    await expect(
      reminders.retry(owner.user, owner.space, issue.id, false, later)
    ).rejects.toMatchObject({ code: 'DUPLICATE_RISK_CONFIRMATION_REQUIRED' })
    await reminders.retry(owner.user, owner.space, issue.id, true, later)
    expect(mailer.messages).toHaveLength(1)
    expect(await reminders.status(owner.user, owner.space, later)).toEqual([])
  })
})
