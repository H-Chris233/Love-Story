import { randomUUID } from 'node:crypto'
import type { MailMessage } from '../mailer.js'
import type { RateLimitStore } from '../rate-limit.js'
import { DELIVERY_LEASE_MS, DELIVERY_RETRY_MS } from './reminder-store.js'

import { DomainError } from '../errors.js'
import type {
  AnniversaryEntry,
  GalleryItem,
  Member,
  MemoryCard,
  MemoryEntry,
  SessionView,
  Space
} from '../types.js'
import type { AuthStore, BootstrapRecord, InvitationRecord } from './auth-store.js'
import type { MediaStore, StoredAsset } from './media-store.js'
import type { ReminderDeliveryKey, ReminderStore } from './reminder-store.js'
import type { GalleryCursor, MemoryCursor, StoryStore } from './story-store.js'

interface UserRecord extends Member {
  passwordHash: string
  spaceId: string
}

interface SessionRecord {
  userId: string
  tokenHash: string
  expiresAt: Date
}

interface StoredInvitation extends InvitationRecord {
  acceptedAt?: Date
}

interface PasswordResetRecord {
  userId: string
  tokenHash: string
  expiresAt: Date
  consumedAt?: Date
}

interface MemoryDelivery extends ReminderDeliveryKey {
  id: string
  status: 'sending' | 'sent' | 'failed'
  message: MailMessage | null
  firstAttemptAt: Date | null
  updatedAt: Date
  leaseToken: string | null
}

function afterMemoryCursor(memory: MemoryEntry, cursor: MemoryCursor | null): boolean {
  return (
    !cursor ||
    memory.occurredOn < cursor.occurredOn ||
    (memory.occurredOn === cursor.occurredOn && memory.createdAt < cursor.createdAt) ||
    (memory.occurredOn === cursor.occurredOn &&
      memory.createdAt === cursor.createdAt &&
      memory.id < cursor.id)
  )
}

function memoryCursor(memory: MemoryEntry): MemoryCursor {
  return { occurredOn: memory.occurredOn, createdAt: memory.createdAt, id: memory.id }
}

function memoryCard(memory: MemoryEntry): MemoryCard {
  return {
    id: memory.id,
    authorName: memory.authorName,
    title: memory.title,
    body: memory.body,
    occurredOn: memory.occurredOn,
    slug: memory.slug,
    cover:
      memory.assets
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))[0] ?? null,
    createdAt: memory.createdAt
  }
}

export interface MemoryStore
  extends AuthStore,
    StoryStore,
    MediaStore,
    ReminderStore,
    RateLimitStore {
  pruneRateLimits(now: Date): Promise<void>
  readonly state: {
    spaces: Space[]
    users: UserRecord[]
    sessions: SessionRecord[]
    invitations: StoredInvitation[]
    passwordResets: PasswordResetRecord[]
    memories: MemoryEntry[]
    anniversaries: AnniversaryEntry[]
    assetRecords: StoredAsset[]
    deliveries: MemoryDelivery[]
    blobDeletions: string[]
  }
  addPartnerForTest(spaceId: string, input: { displayName: string; email: string }): Member
  failNextAssetWriteForTest(): void
}

export function createMemoryStore(): MemoryStore {
  const memberView = (user: UserRecord): Member => ({
    username: user.username,
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    position: user.position,
    createdAt: user.createdAt
  })
  const state: MemoryStore['state'] = {
    spaces: [],
    users: [],
    sessions: [],
    invitations: [],
    passwordResets: [],
    memories: [],
    anniversaries: [],
    assetRecords: [],
    deliveries: [],
    blobDeletions: []
  }

  let failNextAssetWrite = false
  const rateBuckets = new Map<string, { hits: number; expiresAt: Date }>()

  return {
    state,
    async hitRateLimit(key, limit, windowMs, now) {
      let bucket = rateBuckets.get(key)
      if (!bucket || bucket.expiresAt <= now) {
        bucket = { hits: 0, expiresAt: new Date(now.getTime() + windowMs) }
        rateBuckets.set(key, bucket)
      }
      bucket.hits = Math.min(limit + 1, bucket.hits + 1)
      return bucket.hits > limit
        ? Math.max(1, Math.ceil((bucket.expiresAt.getTime() - now.getTime()) / 1000))
        : 0
    },
    async pruneRateLimits(now) {
      for (const [key, bucket] of rateBuckets) if (bucket.expiresAt <= now) rateBuckets.delete(key)
    },
    async listBlobDeletions() {
      return state.blobDeletions.slice(0, 100)
    },
    async finishBlobDeletion(pathname) {
      state.blobDeletions = state.blobDeletions.filter((path) => path !== pathname)
    },
    async isSetup() {
      return state.spaces.length > 0
    },
    async hasSecondMember(spaceId) {
      return state.users.some(
        (candidate) => candidate.spaceId === spaceId && candidate.position === 2
      )
    },
    async bootstrap(input: BootstrapRecord) {
      if (state.spaces.length > 0) {
        throw new DomainError('ALREADY_SETUP', '这个空间已经完成初始化', 409)
      }

      const timestamp = input.now.toISOString()
      const space: Space = {
        id: randomUUID(),
        title: input.storyTitle,
        intro: '把散落在时间里的温柔，慢慢装订成册。',
        relationshipStartedAt: input.relationshipStartedAt,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        username: input.username,
        displayName: input.displayName,
        position: 1,
        passwordHash: input.passwordHash,
        spaceId: space.id,
        createdAt: timestamp
      }

      state.spaces.push(space)
      state.users.push(user)
      return { space, user: memberView(user) }
    },
    async createSession(input) {
      state.sessions.push({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      })
    },
    async findSession(tokenHash, now) {
      const session = state.sessions.find(
        (candidate) => candidate.tokenHash === tokenHash && candidate.expiresAt > now
      )
      if (!session) return null
      const user = state.users.find((candidate) => candidate.id === session.userId)
      if (!user) return null
      const space = state.spaces.find((candidate) => candidate.id === user.spaceId)
      return space ? ({ user: memberView(user), space } satisfies SessionView) : null
    },
    async findCredentials(email) {
      const user = state.users.find((candidate) => candidate.email === email)
      return user ? { userId: user.id, passwordHash: user.passwordHash } : null
    },
    async findLoginCredentials(identifier) {
      const user = state.users.find(
        (row) => row.email === identifier || row.username === identifier
      )
      return user ? { userId: user.id, passwordHash: user.passwordHash } : null
    },
    async updateUsername(userId, username) {
      if (state.users.some((row) => row.id !== userId && row.username === username))
        throw new DomainError('USERNAME_TAKEN', '用户名已被使用', 409)
      const user = state.users.find((row) => row.id === userId)
      if (user) user.username = username
    },
    async deleteSession(tokenHash) {
      state.sessions.splice(
        0,
        state.sessions.length,
        ...state.sessions.filter((candidate) => candidate.tokenHash !== tokenHash)
      )
    },
    async createPasswordReset(input) {
      state.passwordResets.splice(
        0,
        state.passwordResets.length,
        ...state.passwordResets.filter((candidate) => candidate.userId !== input.userId)
      )
      state.passwordResets.push({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt
      })
    },
    async consumePasswordReset(input) {
      const reset = state.passwordResets.find(
        (candidate) =>
          candidate.tokenHash === input.tokenHash &&
          !candidate.consumedAt &&
          candidate.expiresAt > input.now
      )
      if (!reset) {
        throw new DomainError('INVALID_RESET_TOKEN', '重置链接无效或已过期', 400)
      }
      const user = state.users.find((candidate) => candidate.id === reset.userId)
      if (!user) throw new DomainError('INVALID_RESET_TOKEN', '重置链接无效或已过期', 400)
      user.passwordHash = input.passwordHash
      reset.consumedAt = input.now
      state.sessions.splice(
        0,
        state.sessions.length,
        ...state.sessions.filter((candidate) => candidate.userId !== user.id)
      )
    },
    async createInvitation(input) {
      state.invitations.splice(
        0,
        state.invitations.length,
        ...state.invitations.filter(
          (candidate) => candidate.spaceId !== input.spaceId || !!candidate.acceptedAt
        )
      )
      state.invitations.push(input)
    },
    async acceptInvitation(input) {
      const invitation = state.invitations.find(
        (candidate) =>
          candidate.tokenHash === input.tokenHash &&
          !candidate.acceptedAt &&
          candidate.expiresAt > input.now
      )
      if (!invitation) {
        throw new DomainError('INVALID_INVITATION', '邀请链接无效或已过期', 400)
      }
      if (invitation.email !== input.email)
        throw new DomainError('INVALID_INVITATION', '邮箱与邀请不匹配', 400)
      if (state.users.some((row) => row.username === input.username))
        throw new DomainError('USERNAME_TAKEN', '用户名已被使用', 409)
      if (state.users.some((candidate) => candidate.email === invitation.email)) {
        throw new DomainError('INVALID_INVITATION', '邀请链接已被使用', 409)
      }
      if (
        state.users.some(
          (candidate) => candidate.spaceId === invitation.spaceId && candidate.position === 2
        )
      ) {
        throw new DomainError('SPACE_FULL', '这个空间已经有两位成员', 409)
      }

      const timestamp = input.now.toISOString()
      const user: UserRecord = {
        id: randomUUID(),
        email: invitation.email,
        username: input.username,
        displayName: input.displayName,
        position: 2,
        passwordHash: input.passwordHash,
        spaceId: invitation.spaceId,
        createdAt: timestamp
      }
      invitation.acceptedAt = input.now
      state.users.push(user)
      const space = state.spaces.find((candidate) => candidate.id === invitation.spaceId)
      if (!space) throw new DomainError('SPACE_NOT_FOUND', '空间不存在', 404)
      return { space, user: memberView(user) }
    },
    addPartnerForTest(spaceId, input) {
      const user: UserRecord = {
        id: randomUUID(),
        email: input.email,
        displayName: input.displayName,
        username: null,
        position: 2,
        passwordHash: 'unused',
        spaceId,
        createdAt: new Date().toISOString()
      }
      state.users.push(user)
      return user
    },
    async isMember(spaceId, userId) {
      return state.users.some(
        (candidate) => candidate.id === userId && candidate.spaceId === spaceId
      )
    },
    async createMemory(input) {
      const timestamp = input.now.toISOString()
      const memory: MemoryEntry = {
        id: randomUUID(),
        spaceId: input.space.id,
        authorId: input.author.id,
        authorName: input.author.displayName,
        title: input.title,
        body: input.body,
        occurredOn: input.occurredOn,
        visibility: input.visibility,
        slug: input.slug,
        assets: [],
        createdAt: timestamp,
        updatedAt: timestamp
      }
      state.memories.push(memory)
      return memory
    },
    async updateMemory(spaceId, memoryId, patch, now) {
      const memory = state.memories.find(
        (candidate) => candidate.id === memoryId && candidate.spaceId === spaceId
      )
      if (!memory) return null
      Object.assign(memory, patch, { updatedAt: now.toISOString() })
      return memory
    },
    async deleteMemory(spaceId, memoryId) {
      const index = state.memories.findIndex(
        (candidate) => candidate.id === memoryId && candidate.spaceId === spaceId
      )
      if (index < 0) return false
      state.memories.splice(index, 1)
      state.blobDeletions.push(
        ...state.assetRecords
          .filter((asset) => asset.memoryId === memoryId)
          .map((asset) => asset.pathname)
      )
      state.assetRecords = state.assetRecords.filter((asset) => asset.memoryId !== memoryId)
      return true
    },
    async getMemoryBySlug(slug, visibility) {
      return (
        state.memories.find(
          (candidate) => candidate.slug === slug && candidate.visibility === visibility
        ) ?? null
      )
    },
    async getAnniversaryBySlug(slug, visibility) {
      return (
        state.anniversaries.find(
          (candidate) => candidate.slug === slug && candidate.visibility === visibility
        ) ?? null
      )
    },
    async getStoryMetadata(spaceId) {
      const space = spaceId
        ? state.spaces.find((candidate) => candidate.id === spaceId)
        : state.spaces[0]
      if (!space) return null
      const members = state.users
        .filter((candidate) => candidate.spaceId === space.id)
        .map(({ id, displayName }) => ({ id, displayName }))
      return { space, members }
    },
    async listMemories(spaceId, cursor, limit) {
      const rows = state.memories
        .filter((memory) => memory.spaceId === spaceId && afterMemoryCursor(memory, cursor))
        .sort(
          (a, b) =>
            b.occurredOn.localeCompare(a.occurredOn) ||
            b.createdAt.localeCompare(a.createdAt) ||
            b.id.localeCompare(a.id)
        )
      const items = rows.slice(0, limit)
      return {
        items,
        nextCursor: rows.length > limit ? memoryCursor(items.at(-1)!) : null
      }
    },
    async listMemoryCards(spaceId, visibility, cursor, limit) {
      const rows = state.memories
        .filter(
          (memory) =>
            memory.spaceId === spaceId &&
            (!visibility || memory.visibility === visibility) &&
            afterMemoryCursor(memory, cursor)
        )
        .sort(
          (a, b) =>
            b.occurredOn.localeCompare(a.occurredOn) ||
            b.createdAt.localeCompare(a.createdAt) ||
            b.id.localeCompare(a.id)
        )
      const items = rows.slice(0, limit)
      return {
        items: items.map(memoryCard),
        nextCursor: rows.length > limit ? memoryCursor(items.at(-1)!) : null
      }
    },
    async listGallery(spaceId, cursor, limit) {
      const rows = state.memories
        .filter((memory) => memory.spaceId === spaceId)
        .flatMap((memory) =>
          memory.assets.map((asset) => ({
            asset,
            memoryId: memory.id,
            memoryTitle: memory.title,
            occurredOn: memory.occurredOn,
            createdAt: memory.createdAt
          }))
        )
        .filter(
          (item) =>
            !cursor ||
            item.occurredOn < cursor.occurredOn ||
            (item.occurredOn === cursor.occurredOn && item.createdAt < cursor.createdAt) ||
            (item.occurredOn === cursor.occurredOn &&
              item.createdAt === cursor.createdAt &&
              item.memoryId < cursor.id) ||
            (item.occurredOn === cursor.occurredOn &&
              item.createdAt === cursor.createdAt &&
              item.memoryId === cursor.id &&
              item.asset.sortOrder > cursor.sortOrder) ||
            (item.occurredOn === cursor.occurredOn &&
              item.createdAt === cursor.createdAt &&
              item.memoryId === cursor.id &&
              item.asset.sortOrder === cursor.sortOrder &&
              item.asset.id > cursor.assetId)
        )
        .sort(
          (a, b) =>
            b.occurredOn.localeCompare(a.occurredOn) ||
            b.createdAt.localeCompare(a.createdAt) ||
            b.memoryId.localeCompare(a.memoryId) ||
            a.asset.sortOrder - b.asset.sortOrder ||
            a.asset.id.localeCompare(b.asset.id)
        )
      const page = rows.slice(0, limit)
      const last = page.at(-1)
      return {
        items: page.map(
          ({ asset, memoryId, memoryTitle, occurredOn }) =>
            ({ asset, memoryId, memoryTitle, occurredOn }) satisfies GalleryItem
        ),
        nextCursor:
          rows.length > limit && last
            ? ({
                occurredOn: last.occurredOn,
                createdAt: last.createdAt,
                id: last.memoryId,
                sortOrder: last.asset.sortOrder,
                assetId: last.asset.id
              } satisfies GalleryCursor)
            : null
      }
    },
    async listAnniversaries(spaceId, visibility) {
      return state.anniversaries
        .filter(
          (candidate) =>
            candidate.spaceId === spaceId && (!visibility || candidate.visibility === visibility)
        )
        .sort((a, b) => a.originalDate.localeCompare(b.originalDate))
    },
    async createAnniversary(input) {
      const timestamp = input.now.toISOString()
      const anniversary: AnniversaryEntry = {
        id: randomUUID(),
        spaceId: input.space.id,
        authorId: input.author.id,
        title: input.title,
        originalDate: input.originalDate,
        reminderDays: input.reminderDays,
        visibility: input.visibility,
        slug: input.slug,
        createdAt: timestamp,
        updatedAt: timestamp
      }
      state.anniversaries.push(anniversary)
      return anniversary
    },
    async updateAnniversary(spaceId, anniversaryId, patch, now) {
      const anniversary = state.anniversaries.find(
        (candidate) => candidate.id === anniversaryId && candidate.spaceId === spaceId
      )
      if (!anniversary) return null
      Object.assign(anniversary, patch, { updatedAt: now.toISOString() })
      return anniversary
    },
    async deleteAnniversary(spaceId, anniversaryId) {
      const index = state.anniversaries.findIndex(
        (candidate) => candidate.id === anniversaryId && candidate.spaceId === spaceId
      )
      if (index < 0) return false
      state.anniversaries.splice(index, 1)
      return true
    },
    async updateSpace(spaceId, patch, now) {
      const space = state.spaces.find((candidate) => candidate.id === spaceId)
      if (!space) return null
      Object.assign(space, patch, { updatedAt: now.toISOString() })
      return space
    },
    async getMemoryAccess(memoryId) {
      const memory = state.memories.find((candidate) => candidate.id === memoryId)
      return memory ? { spaceId: memory.spaceId, visibility: memory.visibility } : null
    },
    async countAssets(memoryId) {
      return state.assetRecords.filter((candidate) => candidate.memoryId === memoryId).length
    },
    async createAsset(input) {
      if (failNextAssetWrite) {
        failNextAssetWrite = false
        throw new Error('metadata write failed')
      }
      const memory = state.memories.find((candidate) => candidate.id === input.memoryId)
      if (!memory) throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
      const attached = state.assetRecords.filter((asset) => asset.memoryId === input.memoryId)
      if (state.blobDeletions.includes(input.pathname))
        throw new DomainError('INVALID_UPLOAD', '照片已进入删除流程，请重新上传', 409)
      if (state.assetRecords.some((asset) => asset.pathname === input.pathname))
        throw new DomainError('ASSET_EXISTS', '照片已保存', 409)
      if (attached.length >= 10)
        throw new DomainError('TOO_MANY_IMAGES', '每条回忆最多保存 10 张图片', 409)
      const asset: StoredAsset = {
        id: randomUUID(),
        memoryId: input.memoryId,
        pathname: input.pathname,
        originalName: input.originalName,
        mimeType: input.mimeType,
        byteSize: input.byteSize,
        sortOrder: attached.reduce((max, asset) => Math.max(max, asset.sortOrder), -1) + 1,
        url: '',
        spaceId: memory.spaceId,
        visibility: memory.visibility
      }
      asset.url = `/api/media/${asset.id}`
      state.assetRecords.push(asset)
      const { pathname: _pathname, spaceId: _spaceId, visibility: _visibility, ...view } = asset
      void _pathname
      void _spaceId
      void _visibility
      memory.assets.push(view)
      return view
    },
    async getAsset(assetId) {
      const asset = state.assetRecords.find((candidate) => candidate.id === assetId)
      if (!asset) return null
      const memory = state.memories.find((candidate) => candidate.id === asset.memoryId)
      return memory ? { ...asset, visibility: memory.visibility } : null
    },
    async getAssetByPathname(pathname) {
      const asset = state.assetRecords.find((candidate) => candidate.pathname === pathname)
      if (!asset) return null
      const memory = state.memories.find((candidate) => candidate.id === asset.memoryId)
      return memory ? { ...asset, visibility: memory.visibility } : null
    },
    async listAssetsForMemory(memoryId) {
      const memory = state.memories.find((candidate) => candidate.id === memoryId)
      return memory
        ? state.assetRecords
            .filter((candidate) => candidate.memoryId === memoryId)
            .map((asset) => ({ ...asset, visibility: memory.visibility }))
        : []
    },
    async deleteAsset(assetId) {
      const index = state.assetRecords.findIndex((candidate) => candidate.id === assetId)
      if (index < 0) return false
      const [asset] = state.assetRecords.splice(index, 1)
      state.blobDeletions.push(asset.pathname)
      const memory = state.memories.find((candidate) => candidate.id === asset.memoryId)
      if (memory) memory.assets = memory.assets.filter((candidate) => candidate.id !== assetId)
      return true
    },
    failNextAssetWriteForTest() {
      failNextAssetWrite = true
    },
    async listReminderCandidates() {
      return state.anniversaries.map((anniversary) => {
        const space = state.spaces.find((candidate) => candidate.id === anniversary.spaceId)
        return {
          anniversaryId: anniversary.id,
          title: anniversary.title,
          originalDate: anniversary.originalDate,
          reminderDays: anniversary.reminderDays,
          spaceTitle: space?.title ?? '',
          recipients: state.users
            .filter((candidate) => candidate.spaceId === anniversary.spaceId)
            .map(({ id, email, displayName }) => ({ userId: id, email, displayName }))
        }
      })
    },
    async enqueueDelivery(key, message, now) {
      if (
        !state.deliveries.some(
          (row) =>
            row.anniversaryId === key.anniversaryId &&
            row.userId === key.userId &&
            row.occurrenceDate === key.occurrenceDate &&
            row.kind === key.kind
        )
      )
        state.deliveries.push({
          id: randomUUID(),
          ...key,
          message: structuredClone(message),
          firstAttemptAt: null,
          updatedAt: now,
          leaseToken: null,
          status: 'failed'
        })
    },
    async listPendingDeliveries() {
      return state.deliveries.filter((row) => row.status !== 'sent')
    },
    async listReminderIssues(spaceId) {
      return state.deliveries
        .filter((delivery) => {
          const anniversary = state.anniversaries.find(
            (candidate) => candidate.id === delivery.anniversaryId
          )
          const user = state.users.find((candidate) => candidate.id === delivery.userId)
          return (
            anniversary?.spaceId === spaceId &&
            user?.spaceId === spaceId &&
            delivery.status !== 'sent'
          )
        })
        .map((delivery) => ({
          ...delivery,
          status: delivery.status === 'sending' ? 'sending' : 'failed',
          title: state.anniversaries.find((item) => item.id === delivery.anniversaryId)!.title,
          recipient: state.users.find((user) => user.id === delivery.userId)!.displayName
        }))
    },
    async getReminderIssue(spaceId, deliveryId) {
      return (
        (await this.listReminderIssues(spaceId)).find((issue) => issue.id === deliveryId) ?? null
      )
    },
    async claimDelivery(key, now, allowExpired = false) {
      const existing = state.deliveries.find(
        (candidate) =>
          candidate.anniversaryId === key.anniversaryId &&
          candidate.userId === key.userId &&
          candidate.occurrenceDate === key.occurrenceDate &&
          candidate.kind === key.kind
      )
      if (!existing || !existing.message || existing.status === 'sent') return null
      if (
        !allowExpired &&
        existing.firstAttemptAt &&
        now.getTime() - existing.firstAttemptAt.getTime() >= DELIVERY_RETRY_MS
      )
        return null
      if (
        existing.status === 'sending' &&
        now.getTime() - existing.updatedAt.getTime() < DELIVERY_LEASE_MS
      )
        return null
      existing.firstAttemptAt ??= now
      existing.updatedAt = now
      existing.status = 'sending'
      existing.leaseToken = randomUUID()
      return existing.leaseToken
    },
    async finishDelivery(key, result, now, leaseToken) {
      const delivery = state.deliveries.find(
        (candidate) =>
          candidate.anniversaryId === key.anniversaryId &&
          candidate.userId === key.userId &&
          candidate.occurrenceDate === key.occurrenceDate &&
          candidate.kind === key.kind
      )
      if (delivery?.leaseToken === leaseToken) {
        delivery.status = result.error ? 'failed' : 'sent'
        delivery.updatedAt = now
      }
    }
  }
}
