import { createAuthService } from './auth.js'
import { createVercelBlobStorage } from './blob-storage.js'
import { createMediaService } from './media.js'
import { createReminderService } from './reminders.js'
import { createResendMailer } from './resend-mailer.js'
import { createStoryService } from './story.js'
import { DrizzleStore } from './store/drizzle.js'
import { database } from '../db/client.js'
import { requireAppOrigin, requireEnvironment } from './config.js'

const store = new DrizzleStore(database)
const mailer = createResendMailer()
export const appOrigin = requireAppOrigin()
export const cronSecret = requireEnvironment('CRON_SECRET')

export const runtime = {
  store,
  auth: createAuthService({ store, mailer, appOrigin }),
  story: createStoryService({ store }),
  media: createMediaService({ store, blob: createVercelBlobStorage() }),
  reminders: createReminderService({ store, mailer })
}
