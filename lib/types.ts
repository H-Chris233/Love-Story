export type Visibility = 'private' | 'public'

export interface Space {
  id: string
  title: string
  intro: string
  relationshipStartedAt: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  username: string | null
  email: string
  displayName: string
  position: 1 | 2
  createdAt: string
}

export interface SessionView {
  user: Member
  space: Space
}

export interface MemoryAsset {
  id: string
  memoryId: string
  originalName: string
  mimeType: string
  byteSize: number
  sortOrder: number
  url: string
}

export interface MemoryEntry {
  id: string
  spaceId: string
  authorId: string
  authorName: string
  title: string
  body: string
  occurredOn: string
  visibility: Visibility
  slug: string
  assets: MemoryAsset[]
  createdAt: string
  updatedAt: string
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface MemoryCard {
  id: string
  authorName: string
  title: string
  body: string
  occurredOn: string
  slug: string
  cover: MemoryAsset | null
  createdAt: string
}

export interface GalleryItem {
  asset: MemoryAsset
  memoryId: string
  memoryTitle: string
  occurredOn: string
}

export interface AnniversaryEntry {
  id: string
  spaceId: string
  authorId: string
  title: string
  originalDate: string
  reminderDays: number
  visibility: Visibility
  slug: string
  createdAt: string
  updatedAt: string
}

export interface StorySummary {
  space: Space
  members: Array<Pick<Member, 'id' | 'displayName'>>
  memories: MemoryCard[]
}

export interface PublicStory {
  space: Space
  members: Array<Pick<Member, 'id' | 'displayName'>>
  anniversaries: AnniversaryEntry[]
}

export interface ReminderIssue {
  id: string
  title: string
  recipient: string
  occurrenceDate: string
  kind: 'advance' | 'today'
  firstAttemptAt: string | null
  status: 'retryable' | 'needsReview'
}
