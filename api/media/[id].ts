import type { VercelRequest, VercelResponse } from '@vercel/node'

import { DomainError } from '../../lib/errors.js'
import { NO_CONTENT, runApi, writeApiError } from '../../lib/http.js'
import { getOptionalSession, requireSession, runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const value = request.query.id
  const id = Array.isArray(value) ? value[0] : (value ?? '')
  if (request.method === 'DELETE') {
    await runApi(
      request,
      response,
      async () => {
        const session = await requireSession(request)
        await runtime.media.delete(session.user, session.space, id)
        return NO_CONTENT
      },
      { methods: ['DELETE'], requireOrigin: true }
    )
    return
  }
  try {
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET, DELETE')
      throw new DomainError('METHOD_NOT_ALLOWED', '不支持这个请求方法', 405)
    }
    const session = await getOptionalSession(request)
    const blob = await runtime.media.read(id, session?.user)
    response.setHeader('Content-Type', blob.contentType)
    response.setHeader('Cache-Control', 'private, no-store')
    response.status(200).end(Buffer.from(blob.bytes))
  } catch (error) {
    writeApiError(response, error)
  }
}
