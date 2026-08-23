import { del, get, put } from '@vercel/blob'

import type { BlobStorage } from './media.js'

function requireBlobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new Error('缺少必需环境变量 BLOB_READ_WRITE_TOKEN')
  return token
}

export function createVercelBlobStorage(): BlobStorage {
  const token = requireBlobToken()
  return {
    async put(pathname, bytes, contentType) {
      await put(pathname, Buffer.from(bytes), {
        access: 'private',
        token,
        contentType,
        addRandomSuffix: false
      })
    },
    async get(pathname) {
      const result = await get(pathname, { access: 'private', token })
      if (!result || result.statusCode !== 200) return null
      return {
        bytes: new Uint8Array(await new Response(result.stream).arrayBuffer()),
        contentType: result.blob.contentType
      }
    },
    async delete(pathname) {
      await del(pathname, { token })
    }
  }
}
