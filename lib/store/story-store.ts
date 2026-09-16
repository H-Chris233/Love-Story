import type {
  AnniversaryEntry,
  GalleryItem,
  Member,
  MemoryCard,
  MemoryEntry,
  Space,
  Visibility
} from '../types.js'

export interface MemoryCursor {
  occurredOn: string
  createdAt: string
  id: string
}

export interface GalleryCursor extends MemoryCursor {
  sortOrder: number
  assetId: string
}

interface CursorPage<T, C> {
  items: T[]
  nextCursor: C | null
}

export interface StoryStore {
  isMember(spaceId: string, userId: string): Promise<boolean>
  createMemory(input: {
    space: Space
    author: Member
    title: string
    body: string
    occurredOn: string
    visibility: Visibility
    slug: string
    now: Date
  }): Promise<MemoryEntry>
  updateMemory(
    spaceId: string,
    memoryId: string,
    patch: Partial<Pick<MemoryEntry, 'title' | 'body' | 'occurredOn' | 'visibility'>>,
    now: Date
  ): Promise<MemoryEntry | null>
  deleteMemory(spaceId: string, memoryId: string): Promise<boolean>
  getMemoryBySlug(slug: string, visibility: Visibility): Promise<MemoryEntry | null>
  getAnniversaryBySlug(slug: string, visibility: Visibility): Promise<AnniversaryEntry | null>
  getStoryMetadata(
    spaceId?: string
  ): Promise<{ space: Space; members: Array<Pick<Member, 'id' | 'displayName'>> } | null>
  listMemories(
    spaceId: string,
    cursor: MemoryCursor | null,
    limit: number
  ): Promise<CursorPage<MemoryEntry, MemoryCursor>>
  listMemoryCards(
    spaceId: string,
    visibility: Visibility | undefined,
    cursor: MemoryCursor | null,
    limit: number
  ): Promise<CursorPage<MemoryCard, MemoryCursor>>
  listGallery(
    spaceId: string,
    cursor: GalleryCursor | null,
    limit: number
  ): Promise<CursorPage<GalleryItem, GalleryCursor>>
  listAnniversaries(spaceId: string, visibility?: Visibility): Promise<AnniversaryEntry[]>
  createAnniversary(input: {
    space: Space
    author: Member
    title: string
    originalDate: string
    reminderDays: number
    visibility: Visibility
    slug: string
    now: Date
  }): Promise<AnniversaryEntry>
  updateAnniversary(
    spaceId: string,
    anniversaryId: string,
    patch: Partial<
      Pick<AnniversaryEntry, 'title' | 'originalDate' | 'reminderDays' | 'visibility'>
    >,
    now: Date
  ): Promise<AnniversaryEntry | null>
  deleteAnniversary(spaceId: string, anniversaryId: string): Promise<boolean>
  updateSpace(
    spaceId: string,
    patch: Partial<Pick<Space, 'title' | 'intro' | 'relationshipStartedAt'>>,
    now: Date
  ): Promise<Space | null>
}
