import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      const input = readJson<{
        memoryId: string
        pathname: string
        fileName: string
        declaredType: string
      }>(request)
      return runtime.media.completeClientUpload(session.user, session.space, input.memoryId, {
        pathname: input.pathname,
        name: input.fileName,
        declaredType: input.declaredType
      })
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
