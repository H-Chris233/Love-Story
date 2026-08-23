import type { VercelRequest, VercelResponse } from '@vercel/node'

import { NO_CONTENT, readJson, runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      await runtime.auth.resetPassword(readJson<{ token: string; password: string }>(request))
      return NO_CONTENT
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
