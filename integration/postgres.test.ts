import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest'
import * as schema from '../db/schema.js'
import { DrizzleStore } from '../lib/store/drizzle.js'
import { createReminderService } from '../lib/reminders.js'

const connectionString = process.env.TEST_DATABASE_URL
if (!connectionString || !['localhost', '127.0.0.1'].includes(new URL(connectionString).hostname))
  throw new Error('TEST_DATABASE_URL must point to a local, disposable PostgreSQL server')
const databaseName = `love_story_it_${randomUUID().replaceAll('-', '')}`
const admin = new pg.Pool({ connectionString })
let pool: pg.Pool
let store: DrizzleStore
const now = new Date('2026-09-05T00:00:00Z')
const bootstrap = () =>
  store.bootstrap({
    username: 'owner_user',
    storyTitle: '真实数据库',
    displayName: '甲',
    email: 'a@example.com',
    passwordHash: 'test-only',
    relationshipStartedAt: now.toISOString(),
    now
  })
beforeAll(async () => {
  await admin.query(`CREATE DATABASE "${databaseName}"`)
  const target = new URL(connectionString)
  target.pathname = `/${databaseName}`
  pool = new pg.Pool({ connectionString: target.toString() })
  const db = drizzle(pool, { schema })
  await migrate(db, { migrationsFolder: './drizzle' })
  store = new DrizzleStore(db)
})
beforeEach(async () => {
  await pool.query('TRUNCATE spaces, users, rate_limits, blob_deletions CASCADE')
})
afterAll(async () => {
  await pool?.end()
  await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`)
  await admin.end()
})
describe('PostgreSQL transactions and constraints', () => {
  it('allows one initializer and one partner, replacing every pending invitation', async () => {
    const results = await Promise.allSettled([bootstrap(), bootstrap()])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'ALREADY_SETUP' }
    })
    const owner = (
      results.find((result) => result.status === 'fulfilled') as PromiseFulfilledResult<
        Awaited<ReturnType<typeof bootstrap>>
      >
    ).value
    const invitation = {
      spaceId: owner.space.id,
      invitedBy: owner.user.id,
      email: 'old@example.com',
      tokenHash: 'old',
      expiresAt: new Date(now.getTime() + 86400000),
      now
    }
    await store.createInvitation(invitation)
    await Promise.all([
      store.createInvitation({ ...invitation, email: 'b@example.com', tokenHash: 'new1' }),
      store.createInvitation({ ...invitation, email: 'c@example.com', tokenHash: 'new2' })
    ])
    const pending = await pool.query(
      'select token_hash, email from invitations where accepted_at is null'
    )
    expect(pending.rows).toHaveLength(1)
    await expect(
      store.acceptInvitation({
        username: 'partner_user',
        email: 'old@example.com',
        tokenHash: 'old',
        displayName: '乙',
        passwordHash: 'test',
        now
      })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    const accepted = await Promise.allSettled(
      [1, 2].map(() =>
        store.acceptInvitation({
          username: 'partner_user',
          email: pending.rows[0].email,
          tokenHash: pending.rows[0].token_hash,
          displayName: '乙',
          passwordHash: 'test',
          now
        })
      )
    )
    expect(accepted.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect((await pool.query('select * from memberships')).rows).toHaveLength(2)
  })
  it('enforces ten photos concurrently and commits deletion work atomically', async () => {
    const owner = await bootstrap()
    const memory = await store.createMemory({
      space: owner.space,
      author: owner.user,
      title: '照片',
      body: '正文',
      occurredOn: '2026-09-05',
      visibility: 'private',
      slug: 'photos',
      now
    })
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, (_, i) =>
        store.createAsset({
          memoryId: memory.id,
          pathname: `memory/${i}`,
          originalName: 'a.png',
          mimeType: 'image/png',
          byteSize: 8,
          sortOrder: 0,
          now
        })
      )
    )
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(10)
    const assets = await store.listAssetsForMemory(memory.id)
    await pool.query(
      "CREATE FUNCTION fail_cleanup() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'cleanup queue unavailable'; END $$"
    )
    await pool.query(
      'CREATE TRIGGER fail_cleanup BEFORE INSERT ON blob_deletions FOR EACH ROW EXECUTE FUNCTION fail_cleanup()'
    )
    try {
      await expect(store.deleteAsset(assets[0].id)).rejects.toThrow()
      await expect(store.deleteMemory(owner.space.id, memory.id)).rejects.toThrow()
      expect(await store.countAssets(memory.id)).toBe(10)
      expect(await store.listBlobDeletions()).toHaveLength(0)
    } finally {
      await pool.query('DROP TRIGGER fail_cleanup ON blob_deletions')
      await pool.query('DROP FUNCTION fail_cleanup()')
    }
    await store.deleteAsset(assets[0].id)
    await store.createAsset({
      memoryId: memory.id,
      pathname: 'replacement',
      originalName: 'a.png',
      mimeType: 'image/png',
      byteSize: 8,
      sortOrder: 0,
      now
    })
    await store.deleteMemory(owner.space.id, memory.id)
    expect(await store.getMemoryAccess(memory.id)).toBeNull()
    expect(await store.listBlobDeletions()).toHaveLength(11)
  })
  it('shares rate limits across instances and fences old reminder workers', async () => {
    const other = new DrizzleStore(drizzle(pool, { schema }))
    const hits = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        (i % 2 ? store : other).hitRateLimit('shared', 5, 60000, now)
      )
    )
    expect(hits.filter((value) => value === 0)).toHaveLength(5)
    expect(await store.hitRateLimit('shared', 5, 60000, new Date(now.getTime() + 60000))).toBe(0)
    const owner = await bootstrap()
    const anniversary = await store.createAnniversary({
      space: owner.space,
      author: owner.user,
      title: '今天',
      originalDate: '2026-09-05',
      reminderDays: 7,
      visibility: 'private',
      slug: 'today',
      now
    })
    const key = {
      anniversaryId: anniversary.id,
      userId: owner.user.id,
      occurrenceDate: '2026-09-05',
      kind: 'today' as const
    }
    await store.enqueueDelivery(
      key,
      {
        to: 'a@example.com',
        subject: '标题',
        html: '正文',
        kind: 'anniversary-reminder',
        idempotencyKey: 'once'
      },
      now
    )
    const claims = await Promise.all([store.claimDelivery(key, now), other.claimDelivery(key, now)])
    expect(claims.filter(Boolean)).toHaveLength(1)
    const newLease = await other.claimDelivery(key, new Date(now.getTime() + 660000))
    expect(newLease).toBeTruthy()
    await store.finishDelivery(key, {}, now, claims.find(Boolean)!)
    expect(await store.listPendingDeliveries()).toHaveLength(1)
    await other.finishDelivery(key, {}, now, newLease!)
    expect(await store.listPendingDeliveries()).toHaveLength(0)
  })

  it('keeps tied memory and gallery cursor pages stable without exposing private cards', async () => {
    const owner = await bootstrap()
    const created = []
    for (let index = 0; index < 25; index++) {
      created.push(
        await store.createMemory({
          space: owner.space,
          author: owner.user,
          title: `回忆 ${index}`,
          body: '相同日期和创建时间',
          occurredOn: '2026-09-05',
          visibility: index % 2 ? 'private' : 'public',
          slug: `memory-${index}`,
          now
        })
      )
    }
    const first = await store.listMemories(owner.space.id, null, 20)
    const second = await store.listMemories(owner.space.id, first.nextCursor, 20)
    expect(first.items).toHaveLength(20)
    expect(second.items).toHaveLength(5)
    expect(new Set([...first.items, ...second.items].map(({ id }) => id)).size).toBe(25)
    expect((await store.listMemoryCards(owner.space.id, 'public', null, 20)).items).toHaveLength(13)

    for (const [memoryIndex, memory] of created.slice(0, 4).entries()) {
      for (let sortOrder = 0; sortOrder < 8; sortOrder++) {
        await store.createAsset({
          memoryId: memory.id,
          pathname: `gallery/${memoryIndex}/${sortOrder}`,
          originalName: `${memoryIndex}-${sortOrder}.png`,
          mimeType: 'image/png',
          byteSize: 8,
          sortOrder,
          now
        })
      }
    }
    const galleryFirst = await store.listGallery(owner.space.id, null, 30)
    const gallerySecond = await store.listGallery(owner.space.id, galleryFirst.nextCursor, 30)
    const gallery = [...galleryFirst.items, ...gallerySecond.items]
    expect(galleryFirst.items).toHaveLength(30)
    expect(gallerySecond.items).toHaveLength(2)
    expect(new Set(gallery.map(({ asset }) => asset.id)).size).toBe(32)
    for (let index = 1; index < gallery.length; index++) {
      if (gallery[index - 1].memoryId === gallery[index].memoryId) {
        expect(gallery[index - 1].asset.sortOrder).toBeLessThan(gallery[index].asset.sortOrder)
      }
    }
  })

  it('lets only one instance hold a manual reminder retry lease', async () => {
    const owner = await bootstrap()
    const anniversary = await store.createAnniversary({
      space: owner.space,
      author: owner.user,
      title: '今天',
      originalDate: '2026-09-05',
      reminderDays: 7,
      visibility: 'private',
      slug: 'manual-retry',
      now
    })
    await store.enqueueDelivery(
      {
        anniversaryId: anniversary.id,
        userId: owner.user.id,
        occurrenceDate: '2026-09-05',
        kind: 'today'
      },
      {
        to: owner.user.email,
        subject: '标题',
        html: '正文',
        kind: 'anniversary-reminder',
        idempotencyKey: 'manual-once'
      },
      now
    )
    const otherStore = new DrizzleStore(drizzle(pool, { schema }))
    let sends = 0
    const mailer = { send: async () => void sends++ }
    const first = createReminderService({ store, mailer })
    const second = createReminderService({ store: otherStore, mailer })
    const [issue] = await first.status(owner.user, owner.space, now)
    const results = await Promise.allSettled([
      first.retry(owner.user, owner.space, issue.id, false, now),
      second.retry(owner.user, owner.space, issue.id, false, now)
    ])
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    expect(sends).toBe(1)
  })
})
