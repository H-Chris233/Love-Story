import type { VercelRequest } from '@vercel/node'

import { createAuthService } from './auth.js'
import { createVercelBlobStorage } from './blob-storage.js'
import { DomainError } from './errors.js'
import { getSessionToken } from './http.js'
import { createMediaService } from './media.js'
import { createReminderService } from './reminders.js'
import { createResendMailer } from './resend-mailer.js'
import { createStoryService } from './story.js'
import { DrizzleStore } from './store/drizzle.js'

function requireAppOrigin(): string {
  const value = process.env.APP_ORIGIN
  if (!value) throw new Error('缺少必需环境变量 APP_ORIGIN')
  return value.replace(/\/$/, '')
}

const store = new DrizzleStore()
const mailer = createResendMailer()

export const runtime = {
  store,
  auth: createAuthService({ store, mailer, appOrigin: requireAppOrigin() }),
  story: createStoryService({ store }),
  media: createMediaService({ store, blob: createVercelBlobStorage() }),
  reminders: createReminderService({ store, mailer })
}

export async function getOptionalSession(request: VercelRequest) {
  const token = getSessionToken(request)
  return token ? runtime.auth.getSession(token) : null
}

export async function requireSession(request: VercelRequest) {
  const session = await getOptionalSession(request)
  if (!session) throw new DomainError('UNAUTHENTICATED', '请先登录', 401)
  return session
}
