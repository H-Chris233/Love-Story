import type { BlobStorage } from '../media.js'

export interface MemoryBlobStorage extends BlobStorage {
  objects: Map<string, { bytes: Uint8Array; contentType: string }>
}

export function createMemoryBlobStorage(): MemoryBlobStorage {
  const objects = new Map<string, { bytes: Uint8Array; contentType: string }>()
  return {
    objects,
    async put(pathname, bytes, contentType) {
      objects.set(pathname, { bytes, contentType })
    },
    async get(pathname) {
      return objects.get(pathname) ?? null
    },
    async delete(pathname) {
      for (const item of Array.isArray(pathname) ? pathname : [pathname]) objects.delete(item)
    }
  }
}
