import type {
  AnniversaryEntry,
  Member,
  MemoryEntry,
  Space,
  StoryView,
  Visibility
} from '../types.js'

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
  getStory(spaceId?: string, visibility?: Visibility): Promise<StoryView | null>
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
