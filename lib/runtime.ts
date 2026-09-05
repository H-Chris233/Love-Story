import { createAuthService } from './auth.js'
import { createVercelBlobStorage } from './blob-storage.js'
import { createMediaService } from './media.js'
import { createReminderService } from './reminders.js'
import { createResendMailer } from './resend-mailer.js'
import { createStoryService } from './story.js'
import { DrizzleStore } from './store/drizzle.js'
import { database } from '../db/client.js'

function requireAppOrigin(): string {
  const value = process.env.APP_ORIGIN
  if (!value) throw new Error('缺少必需环境变量 APP_ORIGIN')
  return value.replace(/\/$/, '')
}

const store = new DrizzleStore(database)
const mailer = createResendMailer()

export const runtime = {
  store,
  auth: createAuthService({ store, mailer, appOrigin: requireAppOrigin() }),
  story: createStoryService({ store }),
  media: createMediaService({ store, blob: createVercelBlobStorage() }),
  reminders: createReminderService({ store, mailer })
}
