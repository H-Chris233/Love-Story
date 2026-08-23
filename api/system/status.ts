import type { VercelRequest, VercelResponse } from '@vercel/node'

import { runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(request, response, async () => ({ initialized: await runtime.store.isSetup() }), {
    methods: ['GET']
  })
}
