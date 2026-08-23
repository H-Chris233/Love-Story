import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      await runtime.auth.requestPasswordReset(readJson<{ email: string }>(request).email)
      return { accepted: true }
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
