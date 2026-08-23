import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi, setSessionCookie } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const token = await runtime.auth.login(readJson<{ email: string; password: string }>(request))
      const session = await runtime.auth.getSession(token)
      setSessionCookie(response, token)
      return session
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
