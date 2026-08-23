import type { VercelRequest, VercelResponse } from '@vercel/node'

import { NO_CONTENT, readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'
import type { AnniversaryEntry } from '../../lib/types.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  const value = request.query.id
  const id = Array.isArray(value) ? value[0] : (value ?? '')
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      if (request.method === 'DELETE') {
        await runtime.story.deleteAnniversary(session.user, session.space, id)
        return NO_CONTENT
      }
      return runtime.story.updateAnniversary(
        session.user,
        session.space,
        id,
        readJson<
          Partial<Pick<AnniversaryEntry, 'title' | 'originalDate' | 'reminderDays' | 'visibility'>>
        >(request)
      )
    },
    { methods: ['PATCH', 'DELETE'], requireOrigin: true }
  )
}
