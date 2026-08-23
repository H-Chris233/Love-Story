import type { VercelRequest, VercelResponse } from '@vercel/node'

import { DomainError } from '../../lib/errors.js'
import { requestHeader, runApi } from '../../lib/http.js'
import { runtime } from '../../lib/runtime.js'

function requireCronSecret(): string {
  const value = process.env.CRON_SECRET
  if (!value) throw new Error('缺少必需环境变量 CRON_SECRET')
  return value
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      if (requestHeader(request, 'authorization') !== `Bearer ${requireCronSecret()}`) {
        throw new DomainError('UNAUTHENTICATED', '无效的定时任务凭据', 401)
      }
      return runtime.reminders.run()
    },
    { methods: ['GET'] }
  )
}
