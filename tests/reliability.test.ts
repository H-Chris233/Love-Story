// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTestApplication } from '../lib/testing/application.js'
import { createReminderService, getDateInTimeZone } from '../lib/reminders.js'

const input = {
  username: 'owner_user',
  storyTitle: '纪念簿',
  displayName: '甲',
  email: 'a@example.com',
  partnerEmail: 'b@example.com',
  password: 'secure-password',
  relationshipStartedAt: '2024-01-01T00:00:00Z'
}
async function setup() {
  const app = createTestApplication()
  const owner = await app.auth.bootstrap(input)
  const memory = await app.story.createMemory(owner.user, owner.space, {
    title: '照片',
    body: '正文',
    occurredOn: '2025-01-01'
  })
  const asset = await app.media.upload(owner.user, owner.space, memory.id, {
    name: 'a.png',
    declaredType: 'image/png',
    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  })
  return { app, owner, memory, asset }
}
describe('durable cleanup', () => {
  it.each(['asset', 'memory'])(
    'keeps %s files intact on database failure, and retries Blob failure',
    async (kind) => {
      const { app, owner, memory, asset } = await setup()
      const remove = () =>
        kind === 'asset'
          ? app.media.delete(owner.user, owner.space, asset.id)
          : app.media.deleteMemory(owner.user, owner.space, memory.id)
      const databaseFailure = vi
        .spyOn(app.store, kind === 'asset' ? 'deleteAsset' : 'deleteMemory')
        .mockRejectedValueOnce(new Error('database unavailable'))
      await expect(remove()).rejects.toThrow('database unavailable')
      expect(app.blob.objects.size).toBe(1)
      expect(await app.store.getAsset(asset.id)).not.toBeNull()
      databaseFailure.mockRestore()
      const deletion = vi
        .spyOn(app.blob, 'delete')
        .mockRejectedValueOnce(new Error('blob unavailable'))
      await remove()
      expect(await app.store.getAsset(asset.id)).toBeNull()
      expect(await app.store.listBlobDeletions()).toHaveLength(1)
      expect(app.blob.objects.size).toBe(1)
      deletion.mockRestore()
      await app.media.retryDeletions()
      expect(await app.store.listBlobDeletions()).toHaveLength(0)
      expect(app.blob.objects.size).toBe(0)
    }
  )
  it('retries safely when acknowledgement fails after deleting the Blob', async () => {
    const { app, owner, asset } = await setup()
    vi.spyOn(app.store, 'finishBlobDeletion').mockRejectedValueOnce(new Error('ack failed'))
    await app.media.delete(owner.user, owner.space, asset.id)
    expect(app.blob.objects.size).toBe(0)
    expect(await app.store.listBlobDeletions()).toHaveLength(1)
    await app.media.retryDeletions()
    expect(await app.store.listBlobDeletions()).toHaveLength(0)
  })
})
describe('reminder leases', () => {
  it('recovers after mail succeeded but commit failed, reusing the original payload across midnight', async () => {
    const { app, owner } = await setup()
    const now = new Date('2026-12-31T15:55:00Z')
    const anniversary = await app.story.createAnniversary(owner.user, owner.space, {
      title: '跨年',
      originalDate: getDateInTimeZone(now)
    })
    const sent = new Map<string, string>()
    let calls = 0
    const reminders = createReminderService({
      store: app.store,
      mailer: {
        async send(message) {
          calls++
          const json = JSON.stringify(message)
          const previous = sent.get(message.idempotencyKey!)
          if (previous) expect(json).toBe(previous)
          sent.set(message.idempotencyKey!, json)
        }
      }
    })
    vi.spyOn(app.store, 'finishDelivery').mockRejectedValueOnce(new Error('lost commit'))
    await expect(reminders.run(now)).rejects.toThrow('lost commit')
    await app.story.updateAnniversary(owner.user, owner.space, anniversary.id, {
      title: '已经改名'
    })
    await reminders.run(new Date(now.getTime() + 60000))
    expect(calls).toBe(1)
    await Promise.all([
      reminders.run(new Date(now.getTime() + 660000)),
      reminders.run(new Date(now.getTime() + 660000))
    ])
    expect(calls).toBe(2)
    expect(sent.size).toBe(1)
    expect(app.store.state.deliveries[0].status).toBe('sent')
  })
  it('rejects stale worker completion and reports retries beyond the provider window', async () => {
    const { app, owner } = await setup()
    const now = new Date('2026-09-05T00:00:00Z')
    const anniversary = await app.story.createAnniversary(owner.user, owner.space, {
      title: '今天',
      originalDate: '2026-09-05'
    })
    const key = {
      anniversaryId: anniversary.id,
      userId: owner.user.id,
      occurrenceDate: '2026-09-05',
      kind: 'today' as const
    }
    await app.store.enqueueDelivery(
      key,
      {
        to: input.email,
        subject: '标题',
        html: '正文',
        kind: 'anniversary-reminder',
        idempotencyKey: 'stable'
      },
      now
    )
    const old = await app.store.claimDelivery(key, now)
    const lease = await app.store.claimDelivery(key, new Date(now.getTime() + 660000))
    expect(lease).not.toBe(old)
    await app.store.finishDelivery(key, {}, now, old!)
    expect(app.store.state.deliveries[0].status).toBe('sending')
    expect((await app.reminders.run(new Date(now.getTime() + 86400000))).needsReview).toBe(1)
    expect(app.store.state.deliveries[0].status).toBe('sending')
  })
})
describe('shared rate limits', () => {
  it('limits login attempts even if a caller changes spoofed forwarding headers', async () => {
    const app = createTestApplication()
    for (let i = 0; i < 21; i++) {
      const response = await app.handler(
        new Request('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: {
            origin: 'http://localhost:5173',
            'x-forwarded-for': `192.0.2.${i}`,
            'x-vercel-forwarded-for': `192.0.2.${i}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            identifier: `unknown${i}@example.com`,
            password: 'wrong-password'
          })
        })
      )
      expect(response.status).toBe(i < 20 ? 401 : 429)
    }
  })
  it('counts concurrent calls atomically and expires buckets', async () => {
    const { app } = await setup()
    const now = new Date()
    const results = await Promise.all(
      Array.from({ length: 12 }, () => app.store.hitRateLimit('key', 3, 60000, now))
    )
    expect(results.filter((value) => value === 0)).toHaveLength(3)
    expect(await app.store.hitRateLimit('key', 3, 60000, new Date(now.getTime() + 60000))).toBe(0)
  })
  it('uses identical password-recovery limits for known and unknown accounts with Retry-After', async () => {
    const { app } = await setup()
    const request = (email: string) =>
      app.handler(
        new Request('http://localhost:5173/api/auth/forgot-password', {
          method: 'POST',
          headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
          body: JSON.stringify({ email })
        })
      )
    for (const email of [input.email, 'unknown@example.com']) {
      for (let i = 0; i < 3; i++) expect((await request(email)).status).toBe(200)
      const response = await request(email)
      expect(response.status).toBe(429)
      expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0)
      expect((await response.json()).error.code).toBe('RATE_LIMITED')
    }
  })
})
