import { DomainError, assertRequired, assertEmail, assertUsername } from './errors.js'
import { renderEmail } from './email-template.js'
import type { Mailer } from './mailer.js'
import { createToken, hashPassword, hashToken, verifyPassword } from './security.js'
import type { AuthStore } from './store/auth-store.js'
import type { StoryStore } from './store/story-store.js'
import type { Member, Space } from './types.js'

const DAY = 24 * 60 * 60 * 1000

export interface BootstrapInput {
  username: string
  storyTitle: string
  relationshipStartedAt: string
  displayName: string
  email: string
  password: string
  partnerEmail: string
}

export interface AcceptInvitationInput {
  username: string
  email: string
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
      await dependencies.mailer.send({
        to: partnerEmail,
        kind: 'partner-invitation',
        subject: `${member.displayName} 邀请你加入双人纪念簿`,
        html: renderEmail({
          title: '有一份邀请，留给你',
          message: `${member.displayName} 邀请你加入「${space.title}」，一起记录你们的日常。`,
          note: '邀请链接 7 天内有效，仅限受邀邮箱使用一次，请勿转发。如果你不认识邀请人，可以忽略这封邮件。',
          action: { label: '接受邀请', url: `${dependencies.appOrigin}/invite/${invitationToken}` }
        })
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

      const storyTitle = assertRequired(input.storyTitle, 'storyTitle', 160)
      const displayName = assertRequired(input.displayName, 'displayName', 80)
      const username = assertUsername(input.username)
      const email = assertEmail(input.email, 'email')
      const partnerEmail = assertEmail(input.partnerEmail, 'partnerEmail')
      const relationshipStartedAt = new Date(
        assertRequired(input.relationshipStartedAt, 'relationshipStartedAt', 64)
      )
      if (Number.isNaN(relationshipStartedAt.getTime())) {
        throw new DomainError('VALIDATION_ERROR', '恋爱开始时间格式不正确', 400, {
          relationshipStartedAt: '请输入有效的日期和时间'
        })
      }
      if (
        typeof input.password !== 'string' ||
        input.password.length < 10 ||
        input.password.length > 1024
      ) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400, {
          password: '密码至少需要 10 位'
        })
      }
      if (email === partnerEmail) {
        throw new DomainError('INVALID_PARTNER', '伴侣邮箱不能与自己相同', 400)
      }

      const timestamp = now()
      const { space, user } = await dependencies.store.bootstrap({
        username,
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
      const partnerEmail = assertEmail(emailInput, 'partnerEmail')
      if (partnerEmail === member.email) {
        throw new DomainError('INVALID_PARTNER', '伴侣邮箱不能与自己相同', 400)
      }
      const invitationDelivery = await createInvitationAndSend(member, space, partnerEmail, now())
      return { invitationDelivery }
    },
    async login(input: { identifier: string; password: string }) {
      const identifier = assertRequired(input.identifier, 'identifier', 320).toLowerCase()
      const credentials = await dependencies.store.findLoginCredentials(identifier)
      if (
        !credentials ||
        typeof input.password !== 'string' ||
        input.password.length > 1024 ||
        !(await verifyPassword(input.password, credentials.passwordHash))
      ) {
        throw new DomainError('INVALID_CREDENTIALS', '用户名、邮箱或密码不正确', 401)
      }
      return createSession(credentials.userId)
    },
    async logout(token: string) {
      if (token) await dependencies.store.deleteSession(hashToken(token))
    },
    async updateUsername(member: Member, username: unknown) {
      await dependencies.store.updateUsername(member.id, assertUsername(username))
    },
    async requestPasswordReset(emailInput: string) {
      const email = assertEmail(emailInput, 'email')
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
      try {
        await dependencies.mailer.send({
          to: email,
          kind: 'password-reset',
          subject: '重置你的 Love Story 密码',
          html: renderEmail({
            title: '重置你的密码',
            message: '我们收到了你的密码重置请求。点击下方按钮，设置一个新密码。',
            note: '链接 1 小时内有效，且只能使用一次，请勿转发。如果不是你本人操作，请忽略这封邮件，你的密码不会改变。',
            action: { label: '重置密码', url: `${dependencies.appOrigin}/reset-password/${token}` }
          })
        })
      } catch {
        console.error('Password reset email delivery failed')
      }
    },
    async resetPassword(input: { token: string; password: string }) {
      if (
        typeof input.password !== 'string' ||
        input.password.length < 10 ||
        input.password.length > 1024
      ) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400)
      }
      await dependencies.store.consumePasswordReset({
        tokenHash: hashToken(assertRequired(input.token, 'token')),
        passwordHash: await hashPassword(input.password),
        now: now()
      })
    },
    async acceptInvitation(input: AcceptInvitationInput) {
      const username = assertUsername(input.username)
      const email = assertEmail(input.email, 'email')
      const displayName = assertRequired(input.displayName, 'displayName', 80)
      if (
        typeof input.password !== 'string' ||
        input.password.length < 10 ||
        input.password.length > 1024
      ) {
        throw new DomainError('WEAK_PASSWORD', '密码至少需要 10 位', 400, {
          password: '密码至少需要 10 位'
        })
      }
      const { space, user } = await dependencies.store.acceptInvitation({
        username,
        email,
        tokenHash: hashToken(assertRequired(input.token, 'token')),
        displayName,
        passwordHash: await hashPassword(input.password),
        now: now()
      })
      return { space, user, sessionToken: await createSession(user.id) }
    }
  }
}
