import type { VercelRequest, VercelResponse } from '@vercel/node'

import { readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'
import type { Space } from '../../lib/types.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      return runtime.story.updateSpace(
        session.user,
        session.space,
        readJson<Partial<Pick<Space, 'title' | 'intro' | 'relationshipStartedAt'>>>(request)
      )
    },
    { methods: ['PATCH'], requireOrigin: true }
  )
}
