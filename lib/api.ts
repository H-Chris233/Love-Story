import type { createAuthService } from './auth.js'
import type { createStoryService } from './story.js'
import type { createMediaService } from './media.js'
import type { createReminderService } from './reminders.js'
import { DomainError } from './errors.js'
import { apiError, getSessionToken, readJson, sessionCookie } from './http.js'
import { rateLimit, type RateLimitStore } from './rate-limit.js'
import { assertEmail, assertRequired } from './errors.js'

export interface ApiDependencies {
  auth: ReturnType<typeof createAuthService>
  story: ReturnType<typeof createStoryService>
  media: ReturnType<typeof createMediaService>
  reminders: ReturnType<typeof createReminderService>
  store: RateLimitStore & { isSetup(): Promise<boolean>; pruneRateLimits(now: Date): Promise<void> }
  clientAddress?: (request: Request) => string
  appOrigin: string
  cronSecret: string
  uploadToken(
    memoryId: string,
    declaredType: string
  ): Promise<{ pathname: string; clientToken: string }>
}
export function createApi(deps: ApiDependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = new Headers({ 'Cache-Control': 'private, no-store' })
    const url = new URL(request.url)
    const path =
      url.pathname === '/api' || url.pathname === '/api/index'
        ? (url.searchParams.get('path') ?? '')
        : url.pathname.replace(/^\/api\/?/, '')
    if (path.startsWith('public/')) headers.set('X-Robots-Tag', 'noindex, nofollow')
    const method = request.method
    const ip = deps.clientAddress?.(request) ?? 'local'
    const limitEmail = async (scope: string, email: unknown, limit: number, windowMs: number) => {
      const normalized = assertEmail(email, 'email')
      await rateLimit(deps.store, scope, normalized, limit, windowMs)
    }
    const json = <T>(fields: string[]) => readJson<T>(request, fields)
    const session = async () => {
      const value = await deps.auth.getSession(getSessionToken(request))
      if (!value) throw new DomainError('UNAUTHENTICATED', '请先登录', 401)
      return value
    }
    const routes: Record<string, { methods: string[]; run: () => Promise<unknown> }> = {
      'system/status': {
        methods: ['GET'],
        run: async () => ({ initialized: await deps.store.isSetup() })
      },
      'auth/session': { methods: ['GET'], run: session },
      'auth/bootstrap': {
        methods: ['POST'],
        run: async () => {
          const result = await deps.auth.bootstrap(
            await json([
              'storyTitle',
              'username',
              'relationshipStartedAt',
              'displayName',
              'email',
              'password',
              'partnerEmail'
            ])
          )
          headers.set('Set-Cookie', sessionCookie(result.sessionToken))
          return {
            space: result.space,
            user: result.user,
            invitationDelivery: result.invitationDelivery
          }
        }
      },
      'auth/login': {
        methods: ['POST'],
        run: async () => {
          const input = await json<{ identifier: string; password: string }>([
            'identifier',
            'password'
          ])
          await rateLimit(
            deps.store,
            'login-identifier',
            assertRequired(input.identifier, 'identifier', 320).toLowerCase(),
            10,
            900000
          )
          const token = await deps.auth.login(input)
          headers.set('Set-Cookie', sessionCookie(token))
          return deps.auth.getSession(token)
        }
      },
      'auth/logout': {
        methods: ['POST'],
        run: async () => {
          await deps.auth.logout(getSessionToken(request))
          headers.set('Set-Cookie', sessionCookie(''))
        }
      },
      'auth/username': {
        methods: ['PATCH'],
        run: async () => {
          const s = await session()
          await deps.auth.updateUsername(
            s.user,
            (await json<{ username: string }>(['username'])).username
          )
          return deps.auth.getSession(getSessionToken(request))
        }
      },
      'auth/forgot-password': {
        methods: ['POST'],
        run: async () => {
          const input = await json<{ email: string }>(['email'])
          await limitEmail('reset-email', input.email, 3, 3600000)
          await deps.auth.requestPasswordReset(input.email)
          return { accepted: true }
        }
      },
      'auth/reset-password': {
        methods: ['POST'],
        run: async () => deps.auth.resetPassword(await json(['token', 'password']))
      },
      'auth/invitations': {
        methods: ['POST'],
        run: async () => {
          const s = await session()
          await rateLimit(deps.store, 'invitation-member', s.user.id, 3, 3600000)
          return deps.auth.invitePartner(
            s.user,
            s.space,
            (await json<{ partnerEmail: string }>(['partnerEmail'])).partnerEmail
          )
        }
      },
      'auth/invitations/accept': {
        methods: ['POST'],
        run: async () => {
          const r = await deps.auth.acceptInvitation(
            await json(['token', 'displayName', 'password', 'username', 'email'])
          )
          headers.set('Set-Cookie', sessionCookie(r.sessionToken))
          return { space: r.space, user: r.user }
        }
      },
      story: {
        methods: ['GET'],
        run: async () => {
          const s = await session()
          return deps.story.getPrivateStory(s.user, s.space)
        }
      },
      'story/settings': {
        methods: ['PATCH'],
        run: async () => {
          const s = await session()
          return deps.story.updateSpace(
            s.user,
            s.space,
            await json(['title', 'intro', 'relationshipStartedAt'])
          )
        }
      },
      memories: {
        methods: ['GET', 'POST'],
        run: async () => {
          const s = await session()
          return method === 'GET'
            ? (await deps.story.getPrivateStory(s.user, s.space)).memories
            : deps.story.createMemory(
                s.user,
                s.space,
                await json(['title', 'body', 'occurredOn', 'visibility'])
              )
        }
      },
      anniversaries: {
        methods: ['GET', 'POST'],
        run: async () => {
          const s = await session()
          return method === 'GET'
            ? (await deps.story.getPrivateStory(s.user, s.space)).anniversaries
            : deps.story.createAnniversary(
                s.user,
                s.space,
                await json(['title', 'originalDate', 'reminderDays', 'visibility'])
              )
        }
      },
      'public/story': { methods: ['GET'], run: () => deps.story.getPublicStory() },
      'cron/reminders': {
        methods: ['GET'],
        run: async () => {
          if (
            !deps.cronSecret ||
            request.headers.get('authorization') !== `Bearer ${deps.cronSecret}`
          )
            throw new DomainError('UNAUTHENTICATED', '无效的定时任务凭据', 401)
          const cleanup = await deps.media.retryDeletions()
          await deps.store.pruneRateLimits(new Date())
          return { ...(await deps.reminders.run()), cleanup }
        }
      },
      'media/upload-token': {
        methods: ['POST'],
        run: async () => {
          const s = await session()
          const input = await json<{ memoryId: string; declaredType: string }>([
            'memoryId',
            'declaredType'
          ])
          await deps.media.authorizeUpload(s.user, s.space, input.memoryId)
          return deps.uploadToken(input.memoryId, input.declaredType)
        }
      },
      'media/complete': {
        methods: ['POST'],
        run: async () => {
          const s = await session()
          const input = await json<{
            memoryId: string
            pathname: string
            fileName: string
            declaredType: string
          }>(['memoryId', 'pathname', 'fileName', 'declaredType'])
          return deps.media.completeClientUpload(s.user, s.space, input.memoryId, {
            pathname: input.pathname,
            name: input.fileName,
            declaredType: input.declaredType
          })
        }
      }
    }
    const parts = path.split('/')
    let route = Object.hasOwn(routes, path) ? routes[path] : undefined
    if (
      !route &&
      parts.length === 3 &&
      parts[0] === 'public' &&
      ['memories', 'anniversaries'].includes(parts[1])
    )
      route = {
        methods: ['GET'],
        run: () =>
          parts[1] === 'memories'
            ? deps.story.getPublicMemory(parts[2])
            : deps.story.getPublicAnniversary(parts[2])
      }
    if (!route && parts.length === 2 && ['memories', 'anniversaries', 'media'].includes(parts[0]))
      route = {
        methods: parts[0] === 'media' ? ['GET', 'DELETE'] : ['PATCH', 'DELETE'],
        run: async () => {
          const id = parts[1]
          if (parts[0] === 'media' && method === 'GET') {
            const s = await deps.auth.getSession(getSessionToken(request))
            const blob = await deps.media.read(id, s?.user)
            return new Response(new Uint8Array(blob.bytes), {
              headers: { 'Content-Type': blob.contentType, 'Cache-Control': 'private, no-store' }
            })
          }
          const s = await session()
          if (parts[0] === 'media') return deps.media.delete(s.user, s.space, id)
          if (parts[0] === 'memories') {
            if (method === 'DELETE') {
              return deps.media.deleteMemory(s.user, s.space, id)
            }
            return deps.story.updateMemory(
              s.user,
              s.space,
              id,
              await json(['title', 'body', 'occurredOn', 'visibility'])
            )
          }
          if (method === 'DELETE') return deps.story.deleteAnniversary(s.user, s.space, id)
          return deps.story.updateAnniversary(
            s.user,
            s.space,
            id,
            await json(['title', 'originalDate', 'reminderDays', 'visibility'])
          )
        }
      }
    try {
      if (!route) throw new DomainError('NOT_FOUND', '接口不存在', 404)
      if (!route.methods.includes(method)) {
        headers.set('Allow', route.methods.join(', '))
        throw new DomainError('METHOD_NOT_ALLOWED', '不支持这个请求方法', 405)
      }
      if (!['GET', 'HEAD'].includes(method) && request.headers.get('origin') !== deps.appOrigin)
        throw new DomainError('INVALID_ORIGIN', '请求来源无效', 403)
      if (path === 'auth/login') await rateLimit(deps.store, 'login-ip', ip, 20, 900000)
      if (path === 'auth/forgot-password' || path === 'auth/invitations')
        await rateLimit(deps.store, 'mail-ip', ip, 10, 3600000)
      if (
        path === 'auth/bootstrap' ||
        path === 'auth/invitations/accept' ||
        path === 'auth/reset-password'
      )
        await rateLimit(deps.store, 'auth-ip', ip, 20, 900000)
      const result = await route.run()
      if (result instanceof Response) return result
      return result === undefined
        ? new Response(null, { status: 204, headers })
        : Response.json({ data: result }, { headers })
    } catch (error) {
      const response = apiError(error)
      headers.forEach((value, key) => response.headers.set(key, value))
      return response
    }
  }
}
