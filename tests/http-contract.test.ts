// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { createTestApplication } from '../lib/testing/application.js'

const input = {
  username: 'owner_user',
  storyTitle: '纪念簿',
  displayName: '甲',
  email: 'a@example.com',
  partnerEmail: 'b@example.com',
  password: 'secure-password',
  relationshipStartedAt: '2024-01-01T00:00:00Z'
}
describe('real API handler', () => {
  it('enforces cookies, origin, JSON shape, field whitelist and media access', async () => {
    const app = createTestApplication()
    let cookie = ''
    const call = (path: string, method = 'GET', body?: unknown, origin = 'http://localhost:5173') =>
      app.handler(
        new Request(`http://localhost:5173/api/${path}`, {
          method,
          headers: { origin, cookie, 'content-type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body)
        })
      )
    expect((await call('auth/bootstrap', 'POST', input, 'https://evil.example')).status).toBe(403)
    for (const body of [
      null,
      [],
      'text',
      1,
      { ...input, email: 123 },
      { ...input, email: 'bad' },
      { ...input, storyTitle: 'x'.repeat(161) }
    ])
      expect((await call('auth/bootstrap', 'POST', body)).status).toBe(400)
    const malformed = await app.handler(
      new Request('http://localhost:5173/api/auth/bootstrap', {
        method: 'POST',
        headers: { origin: 'http://localhost:5173' },
        body: '{'
      })
    )
    expect(malformed.status).toBe(400)
    const setup = await call('auth/bootstrap', 'POST', input)
    expect(setup.status).toBe(200)
    expect(setup.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Lax')
    cookie = setup.headers.get('set-cookie')!.split(';')[0]
    expect(JSON.stringify(await setup.json())).not.toContain('passwordHash')
    const memory = (
      await (
        await call('memories', 'POST', { title: '海边', body: '故事', occurredOn: '2025-01-01' })
      ).json()
    ).data
    expect((await call('memories?cursor=bad!cursor')).status).toBe(400)
    for (const patch of [
      {},
      { authorId: 'fake' },
      { slug: 'fake' },
      { spaceId: 'fake' },
      { id: 'fake' },
      { title: 123 }
    ])
      expect((await call(`memories/${memory.id}`, 'PATCH', patch)).status).toBe(400)
    expect(app.store.state.memories[0].title).toBe('海边')
    const anniversary = (
      await (
        await call('anniversaries', 'POST', { title: '初见', originalDate: '2025-01-01' })
      ).json()
    ).data
    for (const patch of [
      {},
      { authorId: 'fake' },
      { slug: 'fake' },
      { spaceId: 'fake' },
      { id: 'fake' },
      { title: 123 },
      { reminderDays: null }
    ])
      expect((await call(`anniversaries/${anniversary.id}`, 'PATCH', patch)).status).toBe(400)
    expect(app.store.state.anniversaries[0].title).toBe('初见')
    const token = (
      await (
        await call('media/upload-token', 'POST', { memoryId: memory.id, declaredType: 'image/png' })
      ).json()
    ).data
    app.blob.objects.set(token.pathname, {
      bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      contentType: 'image/png'
    })
    const asset = (
      await (
        await call('media/complete', 'POST', {
          memoryId: memory.id,
          pathname: token.pathname,
          fileName: 'photo.png',
          declaredType: 'image/png'
        })
      ).json()
    ).data
    expect(asset.pathname).toBeUndefined()
    expect((await call(`media/${asset.id}`)).headers.get('content-type')).toBe('image/png')
    const authenticatedCookie = cookie
    cookie = ''
    expect((await call(`media/${asset.id}`)).status).toBe(404)
    cookie = authenticatedCookie
    await call(`memories/${memory.id}`, 'PATCH', { visibility: 'public' })
    cookie = ''
    expect((await call(`media/${asset.id}`)).status).toBe(200)
    expect((await call(`public/memories/${memory.slug}`)).headers.get('x-robots-tag')).toContain(
      'noindex'
    )
    cookie = authenticatedCookie
    await call(`memories/${memory.id}`, 'PATCH', { visibility: 'private' })
    expect((await call(`public/memories/${memory.slug}`)).status).toBe(404)
    expect((await call(`memories/${memory.id}`, 'DELETE')).status).toBe(204)
    expect(app.blob.objects.size).toBe(0)
    expect((await call('cron/reminders')).status).toBe(401)
    const cron = () =>
      app.handler(
        new Request('http://localhost:5173/api/cron/reminders', {
          headers: { authorization: 'Bearer test-cron' }
        })
      )
    expect((await cron()).status).toBe(200)
    expect((await cron()).status).toBe(200)
    expect((await call('auth/logout', 'POST')).status).toBe(204)
    expect((await call('auth/session')).status).toBe(401)
    expect((await call('missing')).status).toBe(404)
    expect((await call('system/status', 'POST', {})).status).toBe(405)
    expect(
      (await app.handler(new Request('http://localhost:5173/api?path=system/status'))).status
    ).toBe(200)
  })
  it('replaces invitations across emails and hides mail failure during password recovery', async () => {
    const app = createTestApplication()
    const owner = await app.auth.bootstrap(input)
    const old = /invite\/([^"<]+)/.exec(app.mailer.messages[0].html)![1]
    await app.auth.invitePartner(owner.user, owner.space, 'new@example.com')
    await expect(
      app.auth.acceptInvitation({
        username: 'partner_user',
        email: 'partner@example.com',
        token: old,
        displayName: '乙',
        password: 'secure-password'
      })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const send = vi.spyOn(app.mailer, 'send').mockRejectedValue(new Error('private provider error'))
    const call = (email: string) =>
      app.handler(
        new Request('http://localhost:5173/api/auth/forgot-password', {
          method: 'POST',
          headers: { origin: 'http://localhost:5173', 'content-type': 'application/json' },
          body: JSON.stringify({ email })
        })
      )
    expect(await (await call(input.email)).json()).toEqual(
      await (await call('unknown@example.com')).json()
    )
    send.mockRestore()
    log.mockRestore()
    await app.auth.requestPasswordReset(input.email)
    const token = /reset-password\/([^"<]+)/.exec(app.mailer.messages.at(-1)!.html)![1]
    await app.auth.resetPassword({ token, password: 'changed-password' })
    expect(await app.auth.getSession(owner.sessionToken)).toBeNull()
  })

  it('returns 503 for unresolved Cron work and rate-limits manual retries per member', async () => {
    const app = createTestApplication()
    const owner = await app.auth.bootstrap(input)
    const anniversary = await app.story.createAnniversary(owner.user, owner.space, {
      title: '今天',
      originalDate: '2026-09-16'
    })
    const now = new Date('2026-09-16T00:00:00.000Z')
    await app.store.enqueueDelivery(
      {
        anniversaryId: anniversary.id,
        userId: owner.user.id,
        occurrenceDate: '2026-09-16',
        kind: 'today'
      },
      {
        to: owner.user.email,
        subject: '标题',
        html: '正文',
        kind: 'anniversary-reminder',
        idempotencyKey: 'stable'
      },
      now
    )
    const send = vi.spyOn(app.mailer, 'send').mockRejectedValue(new Error('provider unavailable'))
    const cron = await app.handler(
      new Request('http://localhost:5173/api/cron/reminders', {
        headers: { authorization: 'Bearer test-cron' }
      })
    )
    expect(cron.status).toBe(503)
    expect(await cron.json()).toMatchObject({ data: { failed: 1, needsReview: 0 } })
    expect(send).toHaveBeenCalledTimes(3)

    const [issue] = await app.store.listReminderIssues(owner.space.id)
    const retry = () =>
      app.handler(
        new Request(`http://localhost:5173/api/reminders/${issue.id}/retry`, {
          method: 'POST',
          headers: {
            origin: 'http://localhost:5173',
            cookie: `love_story_session=${owner.sessionToken}`,
            'content-type': 'application/json'
          },
          body: JSON.stringify({ confirmDuplicateRisk: false })
        })
      )
    for (let attempt = 0; attempt < 10; attempt++) expect((await retry()).status).toBe(503)
    expect((await retry()).status).toBe(429)
  })
})
