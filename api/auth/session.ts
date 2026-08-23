import type { VercelRequest, VercelResponse } from '@vercel/node'

import { runApi } from '../../lib/http.js'
import { requireSession } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(request, response, () => requireSession(request), { methods: ['GET'] })
}
