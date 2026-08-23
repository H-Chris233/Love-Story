import type { VercelRequest, VercelResponse } from '@vercel/node'

import { runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Robots-Tag', 'noindex, nofollow')
  await runApi(request, response, () => runtime.story.getPublicStory(), { methods: ['GET'] })
}
