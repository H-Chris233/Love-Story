import type { MemoryAsset, Visibility } from '../types.js'

export interface StoredAsset extends MemoryAsset {
  pathname: string
  spaceId: string
  visibility: Visibility
}

export interface MediaStore {
  isMember(spaceId: string, userId: string): Promise<boolean>
  getMemoryAccess(memoryId: string): Promise<{ spaceId: string; visibility: Visibility } | null>
  countAssets(memoryId: string): Promise<number>
  createAsset(input: {
    memoryId: string
    pathname: string
    originalName: string
    mimeType: string
    byteSize: number
    sortOrder: number
    now: Date
  }): Promise<MemoryAsset>
  getAsset(assetId: string): Promise<StoredAsset | null>
  getAssetByPathname(pathname: string): Promise<StoredAsset | null>
  listAssetsForMemory(memoryId: string): Promise<StoredAsset[]>
  deleteAsset(assetId: string): Promise<boolean>
}
