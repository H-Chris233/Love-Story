import { randomUUID } from 'node:crypto'

import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import { DomainError } from '../../lib/errors.js'
import { readJson, runApi } from '../../lib/http.js'
import { requireSession, runtime } from '../../lib/runtime.js'

const MAX_BYTES = 5 * 1024 * 1024

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('缺少必需环境变量 BLOB_READ_WRITE_TOKEN')
  return token
}

function extensionFor(contentType: string): string {
  const extension = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
  }[contentType]
  if (!extension)
    throw new DomainError('UNSUPPORTED_IMAGE', '仅支持 JPEG、PNG、WebP 或 GIF 图片', 415)
  return extension
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  await runApi(
    request,
    response,
    async () => {
      const session = await requireSession(request)
      const input = readJson<{ memoryId: string; declaredType: string }>(request)
      await runtime.media.authorizeUpload(session.user, session.space, input.memoryId)
      const pathname = `memories/${input.memoryId}/${randomUUID()}.${extensionFor(input.declaredType)}`
      const clientToken = await generateClientTokenFromReadWriteToken({
        token: requireBlobToken(),
        pathname,
        maximumSizeInBytes: MAX_BYTES,
        allowedContentTypes: [input.declaredType],
        validUntil: Date.now() + 10 * 60 * 1000,
        addRandomSuffix: false,
        allowOverwrite: false
      })
      return { pathname, clientToken }
    },
    { methods: ['POST'], requireOrigin: true }
  )
}
