import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'
import type { Visibility } from '../../lib/types.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      if (request.method === 'GET') {
        return (await runtime.story.getPrivateStory(session.user, session.space)).anniversaries
      }
      return runtime.story.createAnniversary(
        session.user,
        session.space,
        readJson<{
          title: string
          originalDate: string
          reminderDays?: number
          visibility?: Visibility
        }>(request)
      )
    },
    { methods: ['GET', 'POST'], requireOrigin: request.method === 'POST' }
  )
}
