import { randomUUID } from 'node:crypto'

import { parseCalendarDate } from './dates.js'
import { DomainError, assertRequired, assertUuid, assertPatch } from './errors.js'
import type { GalleryCursor, MemoryCursor, StoryStore } from './store/story-store.js'
import type { Member, Space, Visibility } from './types.js'

const PRIVATE_MEMORY_PAGE_SIZE = 20
const PUBLIC_MEMORY_PAGE_SIZE = 20
const GALLERY_PAGE_SIZE = 30
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function decodeCursor<T>(value: string | null, validate: (input: unknown) => input is T): T | null {
  if (value === null) return null
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error()
    const input: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (!validate(input)) throw new Error()
    return input
  } catch {
    throw new DomainError('VALIDATION_ERROR', '分页游标无效', 400)
  }
}

function isMemoryCursor(input: unknown): input is MemoryCursor {
  if (!input || typeof input !== 'object') return false
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).length !== 3 ||
    typeof value.occurredOn !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.id !== 'string' ||
    !UUID.test(value.id)
  )
    return false
  try {
    parseCalendarDate(value.occurredOn)
    return new Date(value.createdAt).toISOString() === value.createdAt
  } catch {
    return false
  }
}

function isGalleryCursor(input: unknown): input is GalleryCursor {
  if (!input || typeof input !== 'object') return false
  const value = input as Record<string, unknown>
  return (
    Object.keys(value).length === 5 &&
    isMemoryCursor({ occurredOn: value.occurredOn, createdAt: value.createdAt, id: value.id }) &&
    Number.isInteger(value.sortOrder) &&
    (value.sortOrder as number) >= 0 &&
    typeof value.assetId === 'string' &&
    UUID.test(value.assetId)
  )
}

const encodeCursor = (value: object | null) =>
  value ? Buffer.from(JSON.stringify(value)).toString('base64url') : null

function assertDate(value: string, field: string): string {
  try {
    parseCalendarDate(value)
  } catch {
    throw new DomainError('VALIDATION_ERROR', '日期格式不正确', 400, {
      [field]: '请使用 YYYY-MM-DD 日期格式'
    })
  }
  return value
}

function assertVisibility(value: Visibility | undefined): Visibility | undefined {
  if (value !== undefined && value !== 'private' && value !== 'public') {
    throw new DomainError('VALIDATION_ERROR', '可见性设置无效', 400)
  }
  return value
}

function assertTimestamp(value: string, field: string): string {
  const date = new Date(assertRequired(value, field, 64))
  if (Number.isNaN(date.getTime())) {
    throw new DomainError('VALIDATION_ERROR', '日期时间格式不正确', 400, {
      [field]: '请输入有效的日期和时间'
    })
  }
  return date.toISOString()
}

function createSlug(date: string): string {
  return `${date}-${randomUUID().slice(0, 8)}`
}

export function createStoryService(dependencies: { store: StoryStore; now?: () => Date }) {
  const now = dependencies.now ?? (() => new Date())

  async function assertMembership(member: Member, space: Space): Promise<void> {
    if (!(await dependencies.store.isMember(space.id, member.id))) {
      throw new DomainError('FORBIDDEN', '你无权访问这个空间', 403)
    }
  }

  return {
    async getPublicStory() {
      const metadata = await dependencies.store.getStoryMetadata()
      if (!metadata) throw new DomainError('STORY_NOT_FOUND', '故事尚未开始', 404)
      return {
        ...metadata,
        anniversaries: await dependencies.store.listAnniversaries(metadata.space.id, 'public')
      }
    },
    async getPublicMemories(cursor: string | null) {
      const metadata = await dependencies.store.getStoryMetadata()
      if (!metadata) throw new DomainError('STORY_NOT_FOUND', '故事尚未开始', 404)
      const page = await dependencies.store.listMemoryCards(
        metadata.space.id,
        'public',
        decodeCursor(cursor, isMemoryCursor),
        PUBLIC_MEMORY_PAGE_SIZE
      )
      return { items: page.items, nextCursor: encodeCursor(page.nextCursor) }
    },
    async getPublicMemory(slug: string) {
      const memory = await dependencies.store.getMemoryBySlug(slug, 'public')
      if (!memory) throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
      return memory
    },
    async getPublicAnniversary(slug: string) {
      const anniversary = await dependencies.store.getAnniversaryBySlug(slug, 'public')
      if (!anniversary) {
        throw new DomainError('ANNIVERSARY_NOT_FOUND', '没有找到这个纪念日', 404)
      }
      return anniversary
    },
    async getPrivateStory(member: Member, space: Space) {
      await assertMembership(member, space)
      const metadata = await dependencies.store.getStoryMetadata(space.id)
      if (!metadata) throw new DomainError('STORY_NOT_FOUND', '故事尚未开始', 404)
      const memories = await dependencies.store.listMemoryCards(space.id, undefined, null, 3)
      return { ...metadata, memories: memories.items }
    },
    async getMemories(member: Member, space: Space, cursor: string | null) {
      await assertMembership(member, space)
      const page = await dependencies.store.listMemories(
        space.id,
        decodeCursor(cursor, isMemoryCursor),
        PRIVATE_MEMORY_PAGE_SIZE
      )
      return { items: page.items, nextCursor: encodeCursor(page.nextCursor) }
    },
    async getGallery(member: Member, space: Space, cursor: string | null) {
      await assertMembership(member, space)
      const page = await dependencies.store.listGallery(
        space.id,
        decodeCursor(cursor, isGalleryCursor),
        GALLERY_PAGE_SIZE
      )
      return { items: page.items, nextCursor: encodeCursor(page.nextCursor) }
    },
    async getAnniversaries(member: Member, space: Space) {
      await assertMembership(member, space)
      return dependencies.store.listAnniversaries(space.id)
    },
    async createMemory(
      member: Member,
      space: Space,
      input: {
        title: string
        body: string
        occurredOn: string
        visibility?: Visibility
      }
    ) {
      await assertMembership(member, space)
      const occurredOn = assertDate(input.occurredOn, 'occurredOn')
      return dependencies.store.createMemory({
        space,
        author: member,
        title: assertRequired(input.title, 'title', 160),
        body: assertRequired(input.body, 'body'),
        occurredOn,
        visibility: assertVisibility(input.visibility) ?? 'private',
        slug: createSlug(occurredOn),
        now: now()
      })
    },
    async updateMemory(
      member: Member,
      space: Space,
      memoryId: string,
      patch: Partial<{
        title: string
        body: string
        occurredOn: string
        visibility: Visibility
      }>
    ) {
      await assertMembership(member, space)
      assertUuid(memoryId, 'MEMORY_NOT_FOUND', '没有找到这条回忆')
      assertPatch(patch, ['title', 'body', 'occurredOn', 'visibility'])
      const normalized = {
        ...(patch.title === undefined ? {} : { title: assertRequired(patch.title, 'title', 160) }),
        ...(patch.body === undefined ? {} : { body: assertRequired(patch.body, 'body') }),
        ...(patch.occurredOn === undefined
          ? {}
          : { occurredOn: assertDate(patch.occurredOn, 'occurredOn') }),
        ...(patch.visibility === undefined
          ? {}
          : { visibility: assertVisibility(patch.visibility) })
      }
      const memory = await dependencies.store.updateMemory(space.id, memoryId, normalized, now())
      if (!memory) throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
      return memory
    },
    async deleteMemory(member: Member, space: Space, memoryId: string) {
      await assertMembership(member, space)
      assertUuid(memoryId, 'MEMORY_NOT_FOUND', '没有找到这条回忆')
      if (!(await dependencies.store.deleteMemory(space.id, memoryId))) {
        throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
      }
    },
    async createAnniversary(
      member: Member,
      space: Space,
      input: {
        title: string
        originalDate: string
        reminderDays?: number
        visibility?: Visibility
      }
    ) {
      await assertMembership(member, space)
      const originalDate = assertDate(input.originalDate, 'originalDate')
      const reminderDays = input.reminderDays === undefined ? 7 : input.reminderDays
      if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 365) {
        throw new DomainError('VALIDATION_ERROR', '提前提醒天数需要在 0 到 365 之间', 400, {
          reminderDays: '请输入 0 到 365 之间的整数'
        })
      }
      return dependencies.store.createAnniversary({
        space,
        author: member,
        title: assertRequired(input.title, 'title', 160),
        originalDate,
        reminderDays,
        visibility: assertVisibility(input.visibility) ?? 'private',
        slug: createSlug(originalDate),
        now: now()
      })
    },
    async updateAnniversary(
      member: Member,
      space: Space,
      anniversaryId: string,
      patch: Partial<{
        title: string
        originalDate: string
        reminderDays: number
        visibility: Visibility
      }>
    ) {
      await assertMembership(member, space)
      assertUuid(anniversaryId, 'ANNIVERSARY_NOT_FOUND', '没有找到这个纪念日')
      assertPatch(patch, ['title', 'originalDate', 'reminderDays', 'visibility'])
      if (
        patch.reminderDays !== undefined &&
        (!Number.isInteger(patch.reminderDays) ||
          patch.reminderDays < 0 ||
          patch.reminderDays > 365)
      ) {
        throw new DomainError('VALIDATION_ERROR', '提前提醒天数需要在 0 到 365 之间', 400)
      }
      const anniversary = await dependencies.store.updateAnniversary(
        space.id,
        anniversaryId,
        {
          ...(patch.reminderDays === undefined ? {} : { reminderDays: patch.reminderDays }),
          ...(patch.title === undefined
            ? {}
            : { title: assertRequired(patch.title, 'title', 160) }),
          ...(patch.originalDate === undefined
            ? {}
            : { originalDate: assertDate(patch.originalDate, 'originalDate') }),
          ...(patch.visibility === undefined
            ? {}
            : { visibility: assertVisibility(patch.visibility) })
        },
        now()
      )
      if (!anniversary) {
        throw new DomainError('ANNIVERSARY_NOT_FOUND', '没有找到这个纪念日', 404)
      }
      return anniversary
    },
    async deleteAnniversary(member: Member, space: Space, anniversaryId: string) {
      await assertMembership(member, space)
      assertUuid(anniversaryId, 'ANNIVERSARY_NOT_FOUND', '没有找到这个纪念日')
      if (!(await dependencies.store.deleteAnniversary(space.id, anniversaryId))) {
        throw new DomainError('ANNIVERSARY_NOT_FOUND', '没有找到这个纪念日', 404)
      }
    },
    async updateSpace(
      member: Member,
      space: Space,
      patch: Partial<Pick<Space, 'title' | 'intro' | 'relationshipStartedAt'>>
    ) {
      await assertMembership(member, space)
      assertPatch(patch, ['title', 'intro', 'relationshipStartedAt'])
      if (
        patch.intro !== undefined &&
        (typeof patch.intro !== 'string' || patch.intro.length > 10000)
      )
        throw new DomainError('VALIDATION_ERROR', '故事短句格式不正确', 400)
      const updated = await dependencies.store.updateSpace(
        space.id,
        {
          ...(patch.title === undefined
            ? {}
            : { title: assertRequired(patch.title, 'title', 160) }),
          ...(patch.intro === undefined ? {} : { intro: patch.intro.trim() }),
          ...(patch.relationshipStartedAt === undefined
            ? {}
            : {
                relationshipStartedAt: assertTimestamp(
                  patch.relationshipStartedAt,
                  'relationshipStartedAt'
                )
              })
        },
        now()
      )
      if (!updated) throw new DomainError('SPACE_NOT_FOUND', '空间不存在', 404)
      return updated
    }
  }
}
