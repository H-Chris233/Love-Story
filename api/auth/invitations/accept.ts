import type { VercelRequest, VercelResponse } from '@vercel/node'

import type { AcceptInvitationInput } from '../../../lib/auth.js'
import { readJson, runApi, setSessionCookie } from '../../../lib/http.js'
import { runtime } from '../../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const result = await runtime.auth.acceptInvitation(readJson<AcceptInvitationInput>(request))
      setSessionCookie(response, result.sessionToken)
      return { space: result.space, user: result.user }
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
