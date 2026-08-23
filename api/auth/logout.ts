import type { VercelRequest, VercelResponse } from '@vercel/node'

import { clearSessionCookie, getSessionToken, NO_CONTENT, runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      await runtime.auth.logout(getSessionToken(request))
      clearSessionCookie(response)
      return NO_CONTENT
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
