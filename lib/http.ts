import type { VercelRequest, VercelResponse } from '@vercel/node'

import { DomainError } from './errors.js'

export const SESSION_COOKIE = 'love_story_session'
export const NO_CONTENT = Symbol('NO_CONTENT')

type ApiResult = unknown | typeof NO_CONTENT

interface ApiOptions {
  methods: string[]
  appOrigin?: string
  requireOrigin?: boolean
}

function getHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()]
  return Array.isArray(value) ? value[0] : value
}

function requireAppOrigin(explicit?: string): string {
  const value = explicit ?? process.env.APP_ORIGIN
  if (!value) throw new Error('缺少必需环境变量 APP_ORIGIN')
  return value.replace(/\/$/, '')
}

export async function runApi(
  request: VercelRequest,
  response: VercelResponse,
  action: () => Promise<ApiResult>,
  options: ApiOptions
): Promise<void> {
  try {
    const method = request.method ?? 'GET'
    if (!options.methods.includes(method)) {
      response.setHeader('Allow', options.methods.join(', '))
      throw new DomainError('METHOD_NOT_ALLOWED', '不支持这个请求方法', 405)
    }
    if (
      options.requireOrigin &&
      getHeader(request, 'origin') !== requireAppOrigin(options.appOrigin)
    ) {
      throw new DomainError('INVALID_ORIGIN', '请求来源无效', 403)
    }

    const result = await action()
    if (result === NO_CONTENT) {
      response.status(204).end()
      return
    }
    response.status(200).json({ data: result })
  } catch (error) {
    writeApiError(response, error)
  }
}

export function writeApiError(response: VercelResponse, error: unknown): void {
  if (error instanceof DomainError) {
    response.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {})
      }
    })
    return
  }
  console.error(error)
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: '服务暂时不可用，请稍后再试' }
  })
}

export function getSessionToken(request: VercelRequest): string {
  const cookie = getHeader(request, 'cookie') ?? ''
  for (const segment of cookie.split(';')) {
    const [name, ...value] = segment.trim().split('=')
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join('='))
  }
  return ''
}

export function setSessionCookie(response: VercelResponse, token: string): void {
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax`
  )
}

export function clearSessionCookie(response: VercelResponse): void {
  response.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
  )
}

export function readJson<T>(request: VercelRequest): T {
  if (typeof request.body === 'string') return JSON.parse(request.body) as T
  if (Buffer.isBuffer(request.body)) return JSON.parse(request.body.toString('utf8')) as T
  return (request.body ?? {}) as T
}

export function requestHeader(request: VercelRequest, name: string): string {
  return getHeader(request, name) ?? ''
}
