import { randomUUID } from 'node:crypto'
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import { createApi } from '../lib/api.js'
import { appOrigin, cronSecret, runtime } from '../lib/runtime.js'
import { DomainError } from '../lib/errors.js'
export default {
  fetch: createApi({
    ...runtime,
    clientAddress: (request) =>
      process.env.VERCEL
        ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        : 'local',
    appOrigin,
    cronSecret,
    async uploadToken(memoryId, declaredType) {
      const extensions: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'image/gif': 'gif'
      }
      if (!Object.hasOwn(extensions, declaredType))
        throw new DomainError('UNSUPPORTED_IMAGE', '仅支持 JPEG、PNG、WebP 或 GIF 图片', 415)
      const pathname = `memories/${memoryId}/${randomUUID()}.${extensions[declaredType]}`
      const clientToken = await generateClientTokenFromReadWriteToken({
        token: process.env.BLOB_READ_WRITE_TOKEN!,
        pathname,
        maximumSizeInBytes: 5 * 1024 * 1024,
        allowedContentTypes: [declaredType],
        validUntil: Date.now() + 600000,
        addRandomSuffix: false,
        allowOverwrite: false
      })
      return { pathname, clientToken }
    }
  })
}
