import type { VercelRequest, VercelResponse } from '@vercel/node'

import { runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      return runtime.story.getPrivateStory(session.user, session.space)
    },
    { methods: ['GET'] }
  )
}
