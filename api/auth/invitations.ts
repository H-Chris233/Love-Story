import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      return runtime.auth.invitePartner(
        session.user,
        session.space,
        readJson<{ partnerEmail: string }>(request).partnerEmail
      )
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
