import { DomainError, assertRequired } from './errors.js'
import { escapeHtml } from './html.js'
import type { Mailer } from './mailer.js'
import { createToken, hashPassword, hashToken, verifyPassword } from './security.js'
import type { AuthStore } from './store/auth-store.js'
import type { StoryStore } from './store/story-store.js'
import type { Member, Space } from './types.js'

const DAY = 24 * 60 * 60 * 1000

export interface BootstrapInput {
  storyTitle: string
  relationshipStartedAt: string
  displayName: string
  email: string
  password: string
  partnerEmail: string
}

export interface AcceptInvitationInput {
  token: string
  displayName: string
  password: string
}

export function createAuthService(dependencies: {
  store: AuthStore & Pick<StoryStore, 'isMember'>
  mailer: Mailer
  appOrigin: string
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())

  async function createSession(userId: string): Promise<string> {
    const token = createToken()
    const timestamp = now()
    await dependencies.store.createSession({
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(timestamp.getTime() + 30 * DAY),
      now: timestamp
    })
    return token
  }

  async function createInvitationAndSend(
    member: Member,
    space: Space,
    partnerEmail: string,
    timestamp: Date
  ): Promise<'sent' | 'failed'> {
    const invitationToken = createToken()
    await dependencies.store.createInvitation({
      spaceId: space.id,
      invitedBy: member.id,
      email: partnerEmail,
      tokenHash: hashToken(invitationToken),
      expiresAt: new Date(timestamp.getTime() + 7 * DAY),
      now: timestamp
    })
    try {
      const safeName = escapeHtml(member.displayName)
      const safeTitle = escapeHtml(space.title)
      await dependencies.mailer.send({
        to: partnerEmail,
        kind: 'partner-invitation',
        subject: `${member.displayName} 邀请你一起装订爱情纪念簿`,
        html: `<p>${safeName} 邀请你加入「${safeTitle}」。</p><p><a href="${dependencies.appOrigin}/invite/${invitationToken}">接受邀请</a></p>`
      })
      return 'sent'
    } catch {
      return 'failed'
    }
  }

  return {
    async bootstrap(input: BootstrapInput) {
      if (await dependencies.store.isSetup()) {
        throw new DomainError('ALREADY_SETUP', '这个空间已经完成初始化', 409)
      }

      const storyTitle = assertRequired(input.storyTitle, 'storyTitle')
      const displayName = assertRequired(input.displayName, 'displayName')
      const email = assertRequired(input.email, 'email').toLowerCase()
      const partnerEmail = assertRequired(input.partnerEmail, 'partnerEmail').toLowerCase()
      const relationshipStartedAt = new Date(input.relationshipStartedAt)
      if (Number.isNaN(relationshipStartedAt.getTime())) {
        throw new DomainError('VALIDATION_ERROR', '恋爱开始时间格式不正确', 400, {
          relationshipStartedAt: '请输入有效的日期和时间'
        })
      }
      if (input.password.length < 10) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400, {
          password: '密码至少需要 10 位'
        })
      }
      if (email === partnerEmail) {
        throw new DomainError('INVALID_PARTNER', '伴侣邮箱不能与自己相同', 400)
      }

      const timestamp = now()
      const { space, user } = await dependencies.store.bootstrap({
        storyTitle,
        relationshipStartedAt: relationshipStartedAt.toISOString(),
        displayName,
        email,
        passwordHash: await hashPassword(input.password),
        now: timestamp
      })
      const sessionToken = await createSession(user.id)
      const invitationDelivery = await createInvitationAndSend(user, space, partnerEmail, timestamp)

      return { space, user, sessionToken, invitationDelivery }
    },
    async getSession(token: string) {
      return dependencies.store.findSession(hashToken(token), now())
    },
    async invitePartner(member: Member, space: Space, emailInput: string) {
      if (!(await dependencies.store.isMember(space.id, member.id))) {
        throw new DomainError('FORBIDDEN', '你无权访问这个空间', 403)
      }
      if (await dependencies.store.hasSecondMember(space.id)) {
        throw new DomainError('SPACE_FULL', '这个空间已经有两位成员', 409)
      }
      const partnerEmail = assertRequired(emailInput, 'partnerEmail').toLowerCase()
      if (partnerEmail === member.email) {
        throw new DomainError('INVALID_PARTNER', '伴侣邮箱不能与自己相同', 400)
      }
      const invitationDelivery = await createInvitationAndSend(member, space, partnerEmail, now())
      return { invitationDelivery }
    },
    async login(input: { email: string; password: string }) {
      const credentials = await dependencies.store.findCredentials(
        assertRequired(input.email, 'email').toLowerCase()
      )
      if (!credentials || !(await verifyPassword(input.password, credentials.passwordHash))) {
        throw new DomainError('INVALID_CREDENTIALS', '邮箱或密码不正确', 401)
      }
      return createSession(credentials.userId)
    },
    async logout(token: string) {
      if (token) await dependencies.store.deleteSession(hashToken(token))
    },
    async requestPasswordReset(emailInput: string) {
      const email = assertRequired(emailInput, 'email').toLowerCase()
      const credentials = await dependencies.store.findCredentials(email)
      if (!credentials) return

      const token = createToken()
      const timestamp = now()
      await dependencies.store.createPasswordReset({
        userId: credentials.userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(timestamp.getTime() + 60 * 60 * 1000),
        now: timestamp
      })
      await dependencies.mailer.send({
        to: email,
        kind: 'password-reset',
        subject: '重置你的 Love Story 密码',
        html: `<p>这个链接将在一小时后失效。</p><p><a href="${dependencies.appOrigin}/reset-password/${token}">重置密码</a></p>`
      })
    },
    async resetPassword(input: { token: string; password: string }) {
      if (input.password.length < 10) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400)
      }
      await dependencies.store.consumePasswordReset({
        tokenHash: hashToken(assertRequired(input.token, 'token')),
        passwordHash: await hashPassword(input.password),
        now: now()
      })
    },
    async acceptInvitation(input: AcceptInvitationInput) {
      const displayName = assertRequired(input.displayName, 'displayName')
      if (input.password.length < 10) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400, {
          password: '密码至少需要 10 位'
        })
      }
      const { space, user } = await dependencies.store.acceptInvitation({
        tokenHash: hashToken(assertRequired(input.token, 'token')),
        displayName,
        passwordHash: await hashPassword(input.password),
        now: now()
      })
      return { space, user, sessionToken: await createSession(user.id) }
    }
  }
}
