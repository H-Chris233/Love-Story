import { describe, expect, it } from 'vitest'

import { createAuthService } from '../lib/auth.js'
import { createMemoryStore } from '../lib/store/memory.js'
import { createRecordingMailer } from '../lib/testing/recording-mailer.js'

describe('AuthService', () => {
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
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    const token = /invite\/([^"<]+)/.exec(mailer.messages[0].html)?.[1]

    const result = await auth.acceptInvitation({
      token: token ?? '',
      displayName: '阿川',
      password: 'another-secure-password'
    })

    expect(result.user.position).toBe(2)
    await expect(
      auth.acceptInvitation({
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
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })

    await expect(
      auth.login({ email: 'owner@example.com', password: 'wrong-password' })
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
    const sessionToken = await auth.login({
      email: 'OWNER@example.com',
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
      storyTitle: '我们的山海日记',
      relationshipStartedAt: '2024-01-13T14:28:46.000Z',
      displayName: '小夏',
      email: 'owner@example.com',
      password: 'a-secure-password',
      partnerEmail: 'partner@example.com'
    })
    mailer.messages.length = 0

    await auth.requestPasswordReset('owner@example.com')
    const token = /reset-password\/([^"<]+)/.exec(mailer.messages[0].html)?.[1] ?? ''
    await auth.resetPassword({ token, password: 'a-brand-new-password' })

    await expect(
      auth.login({ email: 'owner@example.com', password: 'a-secure-password' })
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
        token: invitationToken,
        displayName: '阿川',
        password: 'another-secure-password'
      })
    ).rejects.toMatchObject({ code: 'INVALID_INVITATION' })
    now = new Date('2026-09-23T00:00:01.000Z')
    expect(await auth.getSession(result.sessionToken)).toBeNull()
  })
})
