import { describe, expect, it, vi } from 'vitest'

import { DomainError } from '../lib/errors.js'
import { runApi, setSessionCookie } from '../lib/http.js'

function createResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: new Map<string, string | string[]>(),
    status(code: number) {
      response.statusCode = code
      return response
    },
    json(body: unknown) {
      response.body = body
      return response
    },
    end() {
      return response
    },
    setHeader(name: string, value: string | string[]) {
      response.headers.set(name.toLowerCase(), value)
      return response
    }
  }
  return response
}

describe('HTTP contract', () => {
  it('wraps successful data and field errors in one response shape', async () => {
    const success = createResponse()
    await runApi(
      { method: 'GET', headers: {} } as never,
      success as never,
      async () => ({ greeting: '你好' }),
      { methods: ['GET'], appOrigin: 'https://love.example.com' }
    )
    expect(success.body).toEqual({ data: { greeting: '你好' } })

    const failure = createResponse()
    await runApi(
      { method: 'GET', headers: {} } as never,
      failure as never,
      async () => {
        throw new DomainError('VALIDATION_ERROR', '请检查表单', 400, { title: '必填' })
      },
      { methods: ['GET'], appOrigin: 'https://love.example.com' }
    )
    expect(failure.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: '请检查表单', fields: { title: '必填' } }
    })
  })

  it('rejects a cross-origin write before executing business logic', async () => {
    const response = createResponse()
    const action = vi.fn()
    await runApi(
      { method: 'POST', headers: { origin: 'https://attacker.example' } } as never,
      response as never,
      action,
      { methods: ['POST'], appOrigin: 'https://love.example.com', requireOrigin: true }
    )
    expect(response.statusCode).toBe(403)
    expect(action).not.toHaveBeenCalled()
  })

  it('sets an opaque session in a secure HttpOnly cookie', () => {
    const response = createResponse()
    setSessionCookie(response as never, 'opaque-token')
    expect(response.headers.get('set-cookie')).toContain(
      'love_story_session=opaque-token; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax'
    )
  })
})
