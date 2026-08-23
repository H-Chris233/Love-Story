import { randomUUID } from 'node:crypto'

import { DomainError, assertRequired, assertUuid } from './errors.js'
import type { MediaStore } from './store/media-store.js'
import type { Member, Space } from './types.js'

const MAX_BYTES = 5 * 1024 * 1024
const MAX_ASSETS = 10

export interface BlobStorage {
  put(pathname: string, bytes: Uint8Array, contentType: string): Promise<void>
  get(pathname: string): Promise<{ bytes: Uint8Array; contentType: string } | null>
  delete(pathname: string | string[]): Promise<void>
}

function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
  return prefix.every((value, index) => bytes[index] === value)
}

export function detectImageType(bytes: Uint8Array): string | null {
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61])) return 'image/gif'
  if (hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) return 'image/gif'
  if (
    hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp'
  }
  return null
}

function extensionFor(contentType: string): string {
  return (
    {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif'
    }[contentType] ?? 'bin'
  )
}

export function createMediaService(dependencies: {
  store: MediaStore
  blob: BlobStorage
  now?: () => Date
}) {
  const now = dependencies.now ?? (() => new Date())

  async function assertMemoryAccess(member: Member, space: Space, memoryId: string) {
    assertUuid(memoryId, 'MEMORY_NOT_FOUND', '没有找到这条回忆')
    if (!(await dependencies.store.isMember(space.id, member.id))) {
      throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
    }
    const memory = await dependencies.store.getMemoryAccess(memoryId)
    if (!memory || memory.spaceId !== space.id) {
      throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
    }
  }

  async function authorizeUpload(member: Member, space: Space, memoryId: string) {
    await assertMemoryAccess(member, space, memoryId)
    const count = await dependencies.store.countAssets(memoryId)
    if (count >= MAX_ASSETS) {
      throw new DomainError('TOO_MANY_IMAGES', '每条回忆最多保存 10 张图片', 409)
    }
    return count
  }

  function validateImage(file: { declaredType: string; bytes: Uint8Array }) {
    if (file.bytes.byteLength === 0 || file.bytes.byteLength > MAX_BYTES) {
      throw new DomainError('IMAGE_TOO_LARGE', '图片大小不能超过 5 MB', 413)
    }
    const contentType = detectImageType(file.bytes)
    if (!contentType || contentType !== file.declaredType) {
      throw new DomainError('UNSUPPORTED_IMAGE', '仅支持真实的 JPEG、PNG、WebP 或 GIF 图片', 415)
    }
    return contentType
  }

  return {
    authorizeUpload,
    async upload(
      member: Member,
      space: Space,
      memoryId: string,
      file: { name: string; declaredType: string; bytes: Uint8Array }
    ) {
      const count = await authorizeUpload(member, space, memoryId)
      const contentType = validateImage(file)

      const pathname = `spaces/${space.id}/memories/${memoryId}/${randomUUID()}.${extensionFor(contentType)}`
      await dependencies.blob.put(pathname, file.bytes, contentType)
      try {
        return await dependencies.store.createAsset({
          memoryId,
          pathname,
          originalName: assertRequired(file.name, 'fileName').slice(0, 255),
          mimeType: contentType,
          byteSize: file.bytes.byteLength,
          sortOrder: count,
          now: now()
        })
      } catch (error) {
        await dependencies.blob.delete(pathname)
        throw error
      }
    },
    async completeClientUpload(
      member: Member,
      space: Space,
      memoryId: string,
      file: { pathname: string; name: string; declaredType: string }
    ) {
      if (!file.pathname.startsWith(`memories/${memoryId}/`)) {
        throw new DomainError('INVALID_UPLOAD', '上传路径无效', 400)
      }
      const existing = await dependencies.store.getAssetByPathname(file.pathname)
      if (existing) {
        if (existing.spaceId !== space.id || existing.memoryId !== memoryId) {
          throw new DomainError('INVALID_UPLOAD', '上传路径无效', 400)
        }
        return {
          id: existing.id,
          memoryId: existing.memoryId,
          originalName: existing.originalName,
          mimeType: existing.mimeType,
          byteSize: existing.byteSize,
          sortOrder: existing.sortOrder,
          url: existing.url
        }
      }
      const count = await authorizeUpload(member, space, memoryId)
      try {
        const blob = await dependencies.blob.get(file.pathname)
        if (!blob) throw new DomainError('INVALID_UPLOAD', '没有找到已上传的图片', 400)
        if (blob.contentType !== file.declaredType) {
          throw new DomainError('UNSUPPORTED_IMAGE', '图片内容类型与上传声明不一致', 415)
        }
        const contentType = validateImage({ declaredType: file.declaredType, bytes: blob.bytes })
        return await dependencies.store.createAsset({
          memoryId,
          pathname: file.pathname,
          originalName: assertRequired(file.name, 'fileName').slice(0, 255),
          mimeType: contentType,
          byteSize: blob.bytes.byteLength,
          sortOrder: count,
          now: now()
        })
      } catch (error) {
        await dependencies.blob.delete(file.pathname)
        throw error
      }
    },
    async read(assetId: string, member?: Member) {
      assertUuid(assetId, 'ASSET_NOT_FOUND', '没有找到这张图片')
      const asset = await dependencies.store.getAsset(assetId)
      const authorized =
        asset &&
        (asset.visibility === 'public' ||
          (member && (await dependencies.store.isMember(asset.spaceId, member.id))))
      if (!asset || !authorized) {
        throw new DomainError('ASSET_NOT_FOUND', '没有找到这张图片', 404)
      }
      const blob = await dependencies.blob.get(asset.pathname)
      if (!blob) throw new DomainError('ASSET_NOT_FOUND', '没有找到这张图片', 404)
      return blob
    },
    async delete(member: Member, space: Space, assetId: string) {
      assertUuid(assetId, 'ASSET_NOT_FOUND', '没有找到这张图片')
      const asset = await dependencies.store.getAsset(assetId)
      if (
        !asset ||
        asset.spaceId !== space.id ||
        !(await dependencies.store.isMember(space.id, member.id))
      ) {
        throw new DomainError('ASSET_NOT_FOUND', '没有找到这张图片', 404)
      }
      await dependencies.blob.delete(asset.pathname)
      await dependencies.store.deleteAsset(assetId)
    },
    async deleteMemoryBlobs(member: Member, space: Space, memoryId: string) {
      await assertMemoryAccess(member, space, memoryId)
      const attached = await dependencies.store.listAssetsForMemory(memoryId)
      if (attached.length) await dependencies.blob.delete(attached.map(({ pathname }) => pathname))
    }
  }
}
