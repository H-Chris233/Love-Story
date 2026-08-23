import type { VercelRequest, VercelResponse } from '@vercel/node'

import { runApi } from '../../../lib/http.js'
import { runtime } from '../../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Robots-Tag', 'noindex, nofollow')
  const value = request.query.slug
  const slug = Array.isArray(value) ? value[0] : value
  await runApi(request, response, () => runtime.story.getPublicMemory(slug ?? ''), {
    methods: ['GET']
  })
}
