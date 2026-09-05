import { DomainError } from './errors.js'
import { RateLimitError } from './rate-limit.js'
export const SESSION_COOKIE = 'love_story_session'
export function getSessionToken(request: Request): string {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .find((part) => part.trim().startsWith(`${SESSION_COOKIE}=`))
  try {
    return value ? decodeURIComponent(value.trim().slice(SESSION_COOKIE.length + 1)) : ''
  } catch {
    return ''
  }
}
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${token ? 2592000 : 0}; HttpOnly; Secure; SameSite=Lax`
}
export async function readJson<T>(request: Request, allowed: string[]): Promise<T> {
  let value: unknown
  try {
    value = await request.json()
  } catch {
    throw new DomainError('VALIDATION_ERROR', 'JSON 格式不正确', 400)
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !allowed.includes(key))
  )
    throw new DomainError('VALIDATION_ERROR', '请求字段无效', 400)
  return value as T
}
export function apiError(error: unknown): Response {
  if (error instanceof DomainError)
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {})
        }
      },
      {
        status: error.status,
        headers: error instanceof RateLimitError ? { 'Retry-After': String(error.retryAfter) } : {}
      }
    )
  console.error('API request failed')
  return Response.json(
    { error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后再试' } },
    { status: 500 }
  )
}
