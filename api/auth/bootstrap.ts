import type { VercelRequest, VercelResponse } from '@vercel/node'

import type { BootstrapInput } from '../../lib/auth.js'
import { readJson, runApi, setSessionCookie } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const result = await runtime.auth.bootstrap(readJson<BootstrapInput>(request))
      setSessionCookie(response, result.sessionToken)
      return {
        space: result.space,
        user: result.user,
        invitationDelivery: result.invitationDelivery
      }
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
