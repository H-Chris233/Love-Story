import { describe, expect, it } from 'vitest'

import { createAuthService } from '../lib/auth.js'
import { createStoryService } from '../lib/story.js'
import { createMemoryStore } from '../lib/store/memory.js'
import { createRecordingMailer } from '../lib/testing/recording-mailer.js'

describe('AuthService', () => {
  it('requires username and email, supports both login identifiers and rejects duplicate usernames', async () => {
    const store = createMemoryStore()
    const mailer = createRecordingMailer()
    const auth = createAuthService({ store, mailer, appOrigin: 'https://love.example.com' })
    const input = {
      username: 'Owner_One',
      storyTitle: '我们的故事',
      displayName: '甲',
      email: 'owner@example.com',
      partnerEmail: 'partner@example.com',
      password: 'secure-password',
      relationshipStartedAt: '2024-01-01T00:00:00Z'
    }
    await expect(auth.bootstrap({ ...input, username: '' })).rejects.toMatchObject({ status: 400 })
    await expect(auth.bootstrap({ ...input, email: '' })).rejects.toMatchObject({ status: 400 })
    await expect(auth.bootstrap({ ...input, username: 'has@sign' })).rejects.toMatchObject({
      status: 400
    })
    const owner = await auth.bootstrap(input)
    expect(owner.user.username).toBe('owner_one')
    for (const identifier of ['OWNER_ONE', 'OWNER@example.com']) {
      const token = await auth.login({ identifier, password: input.password })
      expect((await auth.getSession(token))?.user.id).toBe(owner.user.id)
    }
    const token = /invite\/([^"<]+)/.exec(mailer.messages[0].html)![1]
    const partner = {
      token,
      username: 'partner_one',
      email: 'partner@example.com',
      displayName: '乙',
      password: 'partner-password'
    }
    await expect(
      auth.acceptInvitation({ ...partner, email: 'wrong@example.com' })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    await expect(
      auth.acceptInvitation({ ...partner, username: 'OWNER_ONE' })
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' })
    const joined = await auth.acceptInvitation(partner)
    await expect(auth.updateUsername(joined.user, 'OWNER_ONE')).rejects.toMatchObject({
      code: 'USERNAME_TAKEN'
    })
    await auth.updateUsername(joined.user, 'partner_new')
    expect((await auth.getSession(joined.sessionToken))?.user.username).toBe('partner_new')
    expect(
      (
        await auth.getSession(
          await auth.login({ identifier: 'partner_new', password: partner.password })
        )
      )?.user.id
    ).toBe(joined.user.id)
    await expect(
      auth.login({ identifier: 'partner_one', password: partner.password })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(JSON.stringify(await createStoryService({ store }).getPublicStory())).not.toContain(
      'username'
    )
  })
  it('initializes the only space and sends a one-time partner invitation', async () => {
    const store = createMemoryStore()
    const mailer = createRecordingMailer()
    const auth = createAuthService({
      store,
      mailer,
      appOrigin: 'https://love.example.com',
      now: () => new Date('2026-08-23T00:00:00.000Z')
    })

    const result = await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })

    expect(result.space.title).toBe('我们的山海日记')
    expect(result.user.position).toBe(1)
    expect(result.invitationDelivery).toBe('sent')
    expect(mailer.messages[0].html).toContain('<!doctype html>')
    expect(mailer.messages[0].html).toContain('邀请链接 7 天内有效')
    expect(mailer.messages[0].html).toContain('小夏 邀请你加入「我们的山海日记」')
    expect(mailer.messages).toEqual([
      expect.objectContaining({
        to: 'partner@example.com',
        kind: 'partner-invitation'
      })
    ])
    expect(await auth.getSession(result.sessionToken)).toEqual(
      expect.objectContaining({ user: expect.objectContaining({ email: 'owner@example.com' }) })
    )
  })

  it('accepts an invitation once and fills the second member position', async () => {
    const store = createMemoryStore()
    const mailer = createRecordingMailer()
    const now = new Date('2026-08-23T00:00:00.000Z')
    const auth = createAuthService({
      store,
      mailer,
      appOrigin: 'https://love.example.com',
      now: () => now
    })
    await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    const token = /invite\/([^"<]+)/.exec(mailer.messages[0].html)?.[1]

    const result = await auth.acceptInvitation({
      username: 'partner_user',
      email: 'partner@example.com',
      token: token ?? '',
      displayName: '阿川',
      password: 'another-secure-password'
    })

    expect(result.user.position).toBe(2)
    await expect(
      auth.acceptInvitation({
        username: 'partner_user',
        email: 'partner@example.com',
        token: token ?? '',
        displayName: '第三个人',
        password: 'third-secure-password'
      })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    await expect(
      auth.invitePartner(result.user, result.space, 'another@example.com')
    ).rejects.toMatchObject({ code: 'SPACE_FULL' })
  })

  it('creates and revokes a login session without revealing invalid credentials', async () => {
    const store = createMemoryStore()
    const auth = createAuthService({
      store,
      mailer: createRecordingMailer(),
      appOrigin: 'https://love.example.com'
    })
    await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })

    await expect(
      auth.login({ identifier: 'owner@example.com', password: 'wrong-password' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    const sessionToken = await auth.login({
      identifier: 'OWNER@example.com',
      password: 'a-secure-password'
    })
    expect(await auth.getSession(sessionToken)).not.toBeNull()
    await auth.logout(sessionToken)
    expect(await auth.getSession(sessionToken)).toBeNull()
  })

  it('resets a password with a one-hour single-use email token', async () => {
    const store = createMemoryStore()
    const mailer = createRecordingMailer()
    const auth = createAuthService({
      store,
      mailer,
      appOrigin: 'https://love.example.com',
      now: () => new Date('2026-08-23T00:00:00.000Z')
    })
    await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    mailer.messages.length = 0

    await auth.requestPasswordReset('owner@example.com')
    expect(mailer.messages[0].html).toContain('<!doctype html>')
    expect(mailer.messages[0].html).toContain('链接 1 小时内有效')
    expect(mailer.messages[0].html).toContain('如果不是你本人操作')
    const token = /reset-password\/([^"<]+)/.exec(mailer.messages[0].html)?.[1] ?? ''
    await auth.resetPassword({ token, password: 'a-brand-new-password' })

    await expect(
      auth.login({ identifier: 'owner@example.com', password: 'a-secure-password' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    await expect(
      auth.resetPassword({ token, password: 'another-new-password' })
    ).rejects.toMatchObject({ code: 'INVALID_RESET_TOKEN' })
  })

  it('keeps a completed setup when invitation email fails and can send a replacement', async () => {
    const store = createMemoryStore()
    let shouldFail = true
    const messages: string[] = []
    const auth = createAuthService({
      store,
      appOrigin: 'https://love.example.com',
      mailer: {
        async send(message) {
          if (shouldFail) throw new Error('mail unavailable')
          messages.push(message.to)
        }
      }
    })
    const result = await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    expect(result.invitationDelivery).toBe('failed')

    shouldFail = false
    await auth.invitePartner(result.user, result.space, 'partner@example.com')
    expect(messages).toEqual(['partner@example.com'])
  })

  it('allows only one winner during concurrent first-user initialization', async () => {
    const store = createMemoryStore()
    const auth = createAuthService({
      store,
      mailer: createRecordingMailer(),
      appOrigin: 'https://love.example.com'
    })
    const input = {
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    }

    const results = await Promise.allSettled([
      auth.bootstrap(input),
      auth.bootstrap({
        ...input,
        email: 'other@example.com',
        partnerEmail: 'other-partner@example.com'
      })
    ])

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
    expect(results.find(({ status }) => status === 'rejected')).toMatchObject({
      reason: { code: 'ALREADY_SETUP' }
    })
  })

  it('expires invitations after seven days and sessions after thirty days', async () => {
    const store = createMemoryStore()
    const mailer = createRecordingMailer()
    let now = new Date('2026-08-23T00:00:00.000Z')
    const auth = createAuthService({
      store,
      mailer,
      appOrigin: 'https://love.example.com',
      now: () => now
    })
    const result = await auth.bootstrap({
      username: 'owner_user',
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    const invitationToken = /invite\/([^"<]+)/.exec(mailer.messages[0].html)?.[1] ?? ''

    now = new Date('2026-08-31T00:00:00.000Z')
    await expect(
      auth.acceptInvitation({
        username: 'partner_user',
        email: 'partner@example.com',
        token: invitationToken,
        displayName: '阿川',
        password: 'another-secure-password'
      })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    now = new Date('2026-09-23T00:00:01.000Z')
    expect(await auth.getSession(result.sessionToken)).toBeNull()
  })
})
