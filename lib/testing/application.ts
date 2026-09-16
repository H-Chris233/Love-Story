import { randomUUID } from 'node:crypto'
import { createApi } from '../api.js'
import { createAuthService } from '../auth.js'
import { createStoryService } from '../story.js'
import { createMediaService } from '../media.js'
import { createReminderService } from '../reminders.js'
import { createMemoryStore } from '../store/memory.js'
import { createMemoryBlobStorage } from './memory-blob.js'
import { createRecordingMailer } from './recording-mailer.js'
import { DomainError } from '../errors.js'

export function createTestApplication(appOrigin = 'http://localhost:5173') {
  const store = createMemoryStore()
  const blob = createMemoryBlobStorage()
  const mailer = createRecordingMailer()
  const tokens = new Map<string, { pathname: string; type: string }>()
  const auth = createAuthService({ store, mailer, appOrigin })
  const story = createStoryService({ store })
  const media = createMediaService({ store, blob })
  const reminders = createReminderService({ store, mailer, sleep: async () => {} })
  const handler = createApi({
    store,
    auth,
    story,
    media,
    reminders,
    appOrigin,
    cronSecret: 'test-cron',
    async uploadToken(memoryId, type) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(type))
        throw new DomainError('UNSUPPORTED_IMAGE', '图片格式无效', 415)
      const pathname = `memories/${memoryId}/${randomUUID()}`
      const clientToken = `vercel_blob_client_test_${randomUUID()}`
      tokens.set(clientToken, { pathname, type })
      return { pathname, clientToken }
    }
  })
  return { store, blob, mailer, auth, story, media, reminders, handler, tokens }
}
