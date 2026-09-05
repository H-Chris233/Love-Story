import { and, asc, desc, eq, gt, inArray, isNull, ne, lt, sql, or } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import type { MailMessage } from '../mailer.js'
import { DELIVERY_LEASE_MS, DELIVERY_RETRY_MS } from './reminder-store.js'

import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from '../../db/schema.js'
import {
  anniversaries,
  blobDeletions,
  rateLimits,
  assets,
  invitations,
  memories,
  memberships,
  notificationDeliveries,
  passwordResetTokens,
  sessions,
  spaces,
  users
} from '../../db/schema.js'
import { DomainError } from '../errors.js'
import type {
  AnniversaryEntry,
  Member,
  MemoryAsset,
  MemoryEntry,
  SessionView,
  Space,
  StoryView,
  Visibility
} from '../types.js'
import type { AuthStore, BootstrapRecord, InvitationRecord } from './auth-store.js'
import type { MediaStore, StoredAsset } from './media-store.js'
import type { ReminderCandidate, ReminderDeliveryKey, ReminderStore } from './reminder-store.js'
import type { StoryStore } from './story-store.js'

type Database = PgDatabase<PgQueryResultHKT, typeof schema>
type SpaceRow = typeof spaces.$inferSelect
type UserRow = typeof users.$inferSelect
type AssetRow = typeof assets.$inferSelect

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  if ('code' in error && error.code === '23505') return true
  const cause = 'cause' in error ? error.cause : null
  return !!cause && typeof cause === 'object' && 'code' in cause && cause.code === '23505'
}

function toSpace(row: SpaceRow): Space {
  return {
    id: row.id,
    title: row.title,
    intro: row.intro,
    relationshipStartedAt: row.relationshipStartedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  }
}

function toMember(row: UserRow, position: number): Member {
  return {
    username: row.username,
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    position: position === 1 ? 1 : 2,
    createdAt: row.createdAt.toISOString()
  }
}

export class DrizzleStore implements AuthStore, StoryStore, MediaStore, ReminderStore {
  constructor(private readonly db: Database) {}

  async isSetup(): Promise<boolean> {
    const rows = await this.db.select({ id: spaces.id }).from(spaces).limit(1)
    return rows.length > 0
  }

  async hasSecondMember(spaceId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.spaceId, spaceId), eq(memberships.position, 2)))
      .limit(1)
    return rows.length > 0
  }

  async bootstrap(input: BootstrapRecord): Promise<{ space: Space; user: Member }> {
    try {
      return await this.db.transaction(async (transaction) => {
        const [spaceRow] = await transaction
          .insert(spaces)
          .values({
            title: input.storyTitle,
            relationshipStartedAt: new Date(input.relationshipStartedAt),
            createdAt: input.now,
            updatedAt: input.now
          })
          .returning()
        const [userRow] = await transaction
          .insert(users)
          .values({
            email: input.email,
            username: input.username,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            createdAt: input.now,
            updatedAt: input.now
          })
          .returning()
        await transaction.insert(memberships).values({
          spaceId: spaceRow.id,
          userId: userRow.id,
          position: 1,
          createdAt: input.now
        })
        return { space: toSpace(spaceRow), user: toMember(userRow, 1) }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError('ALREADY_SETUP', '这个空间已经完成初始化', 409)
      }
      throw error
    }
  }

  async createSession(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void> {
    await this.db.insert(sessions).values({
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: input.now
    })
  }

  async findSession(tokenHash: string, now: Date): Promise<SessionView | null> {
    const [row] = await this.db
      .select({ user: users, space: spaces, position: memberships.position })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .innerJoin(memberships, eq(memberships.userId, users.id))
      .innerJoin(spaces, eq(spaces.id, memberships.spaceId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1)
    return row ? { user: toMember(row.user, row.position), space: toSpace(row.space) } : null
  }

  async findCredentials(email: string): Promise<{ userId: string; passwordHash: string } | null> {
    const [row] = await this.db
      .select({ userId: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    return row ?? null
  }

  async findLoginCredentials(identifier: string) {
    const [row] = await this.db
      .select({ userId: users.id, passwordHash: users.passwordHash })
      .from(users)
      .where(or(eq(users.email, identifier), eq(users.username, identifier)))
      .limit(1)
    return row ?? null
  }
  async updateUsername(userId: string, username: string): Promise<void> {
    try {
      await this.db
        .update(users)
        .set({ username, updatedAt: new Date() })
        .where(eq(users.id, userId))
    } catch (error) {
      if (isUniqueViolation(error)) throw new DomainError('USERNAME_TAKEN', '用户名已被使用', 409)
      throw error
    }
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
  }

  async createPasswordReset(input: {
    userId: string
    tokenHash: string
    expiresAt: Date
    now: Date
  }): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await transaction
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, input.userId))
      await transaction.insert(passwordResetTokens).values({
        userId: input.userId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: input.now
      })
    })
  }

  async consumePasswordReset(input: {
    tokenHash: string
    passwordHash: string
    now: Date
  }): Promise<void> {
    await this.db.transaction(async (transaction) => {
      const [reset] = await transaction
        .select()
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, input.tokenHash),
            isNull(passwordResetTokens.consumedAt),
            gt(passwordResetTokens.expiresAt, input.now)
          )
        )
        .for('update')
        .limit(1)
      if (!reset) throw new DomainError('INVALID_RESET_TOKEN', '重置链接无效或已过期', 400)

      await transaction
        .update(passwordResetTokens)
        .set({ consumedAt: input.now })
        .where(eq(passwordResetTokens.tokenHash, input.tokenHash))
      await transaction
        .update(users)
        .set({ passwordHash: input.passwordHash, updatedAt: input.now })
        .where(eq(users.id, reset.userId))
      await transaction.delete(sessions).where(eq(sessions.userId, reset.userId))
    })
  }

  async createInvitation(input: InvitationRecord): Promise<void> {
    await this.db.transaction(async (transaction) => {
      await transaction
        .select({ id: spaces.id })
        .from(spaces)
        .where(eq(spaces.id, input.spaceId))
        .for('update')
      await transaction
        .delete(invitations)
        .where(and(eq(invitations.spaceId, input.spaceId), isNull(invitations.acceptedAt)))
      await transaction.insert(invitations).values({
        spaceId: input.spaceId,
        invitedBy: input.invitedBy,
        email: input.email,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        createdAt: input.now
      })
    })
  }

  async acceptInvitation(input: {
    username: string
    email: string
    tokenHash: string
    displayName: string
    passwordHash: string
    now: Date
  }): Promise<{ space: Space; user: Member }> {
    try {
      return await this.db.transaction(async (transaction) => {
        const [invitation] = await transaction
          .select()
          .from(invitations)
          .where(
            and(
              eq(invitations.tokenHash, input.tokenHash),
              isNull(invitations.acceptedAt),
              gt(invitations.expiresAt, input.now)
            )
          )
          .for('update')
          .limit(1)
        if (!invitation) {
          throw new DomainError('INVALID_INVITATION', '邀请链接无效或已过期', 400)
        }
        if (invitation.email !== input.email)
          throw new DomainError('INVALID_INVITATION', '邮箱与邀请不匹配', 400)
        const [taken] = await transaction
          .select({ id: users.id })
          .from(users)
          .where(eq(users.username, input.username))
          .limit(1)
        if (taken) throw new DomainError('USERNAME_TAKEN', '用户名已被使用', 409)

        const [spaceRow] = await transaction
          .select()
          .from(spaces)
          .where(eq(spaces.id, invitation.spaceId))
          .limit(1)
        if (!spaceRow) throw new DomainError('SPACE_NOT_FOUND', '空间不存在', 404)

        const [userRow] = await transaction
          .insert(users)
          .values({
            email: invitation.email,
            username: input.username,
            displayName: input.displayName,
            passwordHash: input.passwordHash,
            createdAt: input.now,
            updatedAt: input.now
          })
          .returning()
        await transaction.insert(memberships).values({
          spaceId: invitation.spaceId,
          userId: userRow.id,
          position: 2,
          createdAt: input.now
        })
        await transaction
          .update(invitations)
          .set({ acceptedAt: input.now })
          .where(eq(invitations.id, invitation.id))
        return { space: toSpace(spaceRow), user: toMember(userRow, 2) }
      })
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DomainError('SPACE_FULL', '这个空间已经有两位成员', 409)
      }
      throw error
    }
  }

  async isMember(spaceId: string, userId: string): Promise<boolean> {
    const rows = await this.db
      .select({ userId: memberships.userId })
      .from(memberships)
      .where(and(eq(memberships.spaceId, spaceId), eq(memberships.userId, userId)))
      .limit(1)
    return rows.length > 0
  }

  async createMemory(input: Parameters<StoryStore['createMemory']>[0]): Promise<MemoryEntry> {
    const [row] = await this.db
      .insert(memories)
      .values({
        spaceId: input.space.id,
        authorId: input.author.id,
        title: input.title,
        body: input.body,
        occurredOn: input.occurredOn,
        visibility: input.visibility,
        slug: input.slug,
        createdAt: input.now,
        updatedAt: input.now
      })
      .returning()
    return {
      ...row,
      authorName: input.author.displayName,
      assets: [],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private async loadMemoryById(spaceId: string, memoryId: string): Promise<MemoryEntry | null> {
    const [row] = await this.db
      .select({ memory: memories, authorName: users.displayName })
      .from(memories)
      .innerJoin(users, eq(users.id, memories.authorId))
      .where(and(eq(memories.spaceId, spaceId), eq(memories.id, memoryId)))
      .limit(1)
    if (!row) return null
    const media = await this.loadAssets([row.memory.id])
    return this.toMemory(row.memory, row.authorName, media.get(row.memory.id) ?? [])
  }

  async updateMemory(
    spaceId: string,
    memoryId: string,
    patch: Partial<Pick<MemoryEntry, 'title' | 'body' | 'occurredOn' | 'visibility'>>,
    now: Date
  ): Promise<MemoryEntry | null> {
    const changed = await this.db
      .update(memories)
      .set({ ...patch, updatedAt: now })
      .where(and(eq(memories.spaceId, spaceId), eq(memories.id, memoryId)))
      .returning({ id: memories.id })
    return changed.length ? this.loadMemoryById(spaceId, memoryId) : null
  }

  async deleteMemory(spaceId: string, memoryId: string): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [memory] = await transaction
        .select({ id: memories.id })
        .from(memories)
        .where(and(eq(memories.spaceId, spaceId), eq(memories.id, memoryId)))
        .for('update')
      if (!memory) return false
      const attached = await transaction
        .select({ pathname: assets.pathname })
        .from(assets)
        .where(eq(assets.memoryId, memoryId))
      if (attached.length)
        await transaction.insert(blobDeletions).values(attached).onConflictDoNothing()
      await transaction.delete(memories).where(eq(memories.id, memoryId))
      return true
    })
  }

  async getMemoryBySlug(slug: string, visibility: Visibility): Promise<MemoryEntry | null> {
    const [row] = await this.db
      .select({ memory: memories, authorName: users.displayName })
      .from(memories)
      .innerJoin(users, eq(users.id, memories.authorId))
      .where(and(eq(memories.slug, slug), eq(memories.visibility, visibility)))
      .limit(1)
    if (!row) return null
    const media = await this.loadAssets([row.memory.id])
    return this.toMemory(row.memory, row.authorName, media.get(row.memory.id) ?? [])
  }

  async getAnniversaryBySlug(
    slug: string,
    visibility: Visibility
  ): Promise<AnniversaryEntry | null> {
    const [row] = await this.db
      .select()
      .from(anniversaries)
      .where(and(eq(anniversaries.slug, slug), eq(anniversaries.visibility, visibility)))
      .limit(1)
    return row ? this.toAnniversary(row) : null
  }

  async getStory(spaceId?: string, visibility?: Visibility): Promise<StoryView | null> {
    const [spaceRow] = spaceId
      ? await this.db.select().from(spaces).where(eq(spaces.id, spaceId)).limit(1)
      : await this.db.select().from(spaces).limit(1)
    if (!spaceRow) return null

    const memberRows = await this.db
      .select({ id: users.id, displayName: users.displayName })
      .from(memberships)
      .innerJoin(users, eq(users.id, memberships.userId))
      .where(eq(memberships.spaceId, spaceRow.id))
      .orderBy(asc(memberships.position))
    const memoryRows = await this.db
      .select({ memory: memories, authorName: users.displayName })
      .from(memories)
      .innerJoin(users, eq(users.id, memories.authorId))
      .where(
        visibility
          ? and(eq(memories.spaceId, spaceRow.id), eq(memories.visibility, visibility))
          : eq(memories.spaceId, spaceRow.id)
      )
      .orderBy(desc(memories.occurredOn), desc(memories.createdAt))
    const media = await this.loadAssets(memoryRows.map(({ memory }) => memory.id))
    const anniversaryRows = await this.db
      .select()
      .from(anniversaries)
      .where(
        visibility
          ? and(eq(anniversaries.spaceId, spaceRow.id), eq(anniversaries.visibility, visibility))
          : eq(anniversaries.spaceId, spaceRow.id)
      )
      .orderBy(asc(anniversaries.originalDate))

    return {
      space: toSpace(spaceRow),
      members: memberRows,
      memories: memoryRows.map(({ memory, authorName }) =>
        this.toMemory(memory, authorName, media.get(memory.id) ?? [])
      ),
      anniversaries: anniversaryRows.map((row) => this.toAnniversary(row))
    }
  }

  async createAnniversary(
    input: Parameters<StoryStore['createAnniversary']>[0]
  ): Promise<AnniversaryEntry> {
    const [row] = await this.db
      .insert(anniversaries)
      .values({
        spaceId: input.space.id,
        authorId: input.author.id,
        title: input.title,
        originalDate: input.originalDate,
        reminderDays: input.reminderDays,
        visibility: input.visibility,
        slug: input.slug,
        createdAt: input.now,
        updatedAt: input.now
      })
      .returning()
    return this.toAnniversary(row)
  }

  async updateAnniversary(
    spaceId: string,
    anniversaryId: string,
    patch: Partial<
      Pick<AnniversaryEntry, 'title' | 'originalDate' | 'reminderDays' | 'visibility'>
    >,
    now: Date
  ): Promise<AnniversaryEntry | null> {
    const [row] = await this.db
      .update(anniversaries)
      .set({ ...patch, updatedAt: now })
      .where(and(eq(anniversaries.spaceId, spaceId), eq(anniversaries.id, anniversaryId)))
      .returning()
    return row ? this.toAnniversary(row) : null
  }

  async deleteAnniversary(spaceId: string, anniversaryId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(anniversaries)
      .where(and(eq(anniversaries.spaceId, spaceId), eq(anniversaries.id, anniversaryId)))
      .returning({ id: anniversaries.id })
    return deleted.length > 0
  }

  async updateSpace(
    spaceId: string,
    patch: Partial<Pick<Space, 'title' | 'intro' | 'relationshipStartedAt'>>,
    now: Date
  ): Promise<Space | null> {
    const [row] = await this.db
      .update(spaces)
      .set({
        ...(patch.title === undefined ? {} : { title: patch.title }),
        ...(patch.intro === undefined ? {} : { intro: patch.intro }),
        ...(patch.relationshipStartedAt === undefined
          ? {}
          : { relationshipStartedAt: new Date(patch.relationshipStartedAt) }),
        updatedAt: now
      })
      .where(eq(spaces.id, spaceId))
      .returning()
    return row ? toSpace(row) : null
  }

  async getMemoryAccess(
    memoryId: string
  ): Promise<{ spaceId: string; visibility: Visibility } | null> {
    const [row] = await this.db
      .select({ spaceId: memories.spaceId, visibility: memories.visibility })
      .from(memories)
      .where(eq(memories.id, memoryId))
      .limit(1)
    return row ?? null
  }

  async countAssets(memoryId: string): Promise<number> {
    const rows = await this.db
      .select({ id: assets.id })
      .from(assets)
      .where(eq(assets.memoryId, memoryId))
    return rows.length
  }

  async createAsset(input: {
    memoryId: string
    pathname: string
    originalName: string
    mimeType: string
    byteSize: number
    sortOrder: number
    now: Date
  }): Promise<MemoryAsset> {
    return this.db.transaction(async (transaction) => {
      const [memory] = await transaction
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.id, input.memoryId))
        .for('update')
      if (!memory) throw new DomainError('MEMORY_NOT_FOUND', '没有找到这条回忆', 404)
      const [pendingDeletion] = await transaction
        .select({ pathname: blobDeletions.pathname })
        .from(blobDeletions)
        .where(eq(blobDeletions.pathname, input.pathname))
      if (pendingDeletion)
        throw new DomainError('INVALID_UPLOAD', '照片已进入删除流程，请重新上传', 409)
      const attached = await transaction
        .select({ sortOrder: assets.sortOrder })
        .from(assets)
        .where(eq(assets.memoryId, input.memoryId))
      if (attached.length >= 10)
        throw new DomainError('TOO_MANY_IMAGES', '每条回忆最多保存 10 张图片', 409)
      const [row] = await transaction
        .insert(assets)
        .values({
          memoryId: input.memoryId,
          pathname: input.pathname,
          originalName: input.originalName,
          mimeType: input.mimeType,
          byteSize: input.byteSize,
          sortOrder: attached.reduce((max, asset) => Math.max(max, asset.sortOrder), -1) + 1,
          createdAt: input.now
        })
        .returning()
      return {
        id: row.id,
        memoryId: row.memoryId,
        originalName: row.originalName,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        sortOrder: row.sortOrder,
        url: `/api/media/${row.id}`
      }
    })
  }

  async getAsset(assetId: string): Promise<StoredAsset | null> {
    const [row] = await this.db
      .select({ asset: assets, spaceId: memories.spaceId, visibility: memories.visibility })
      .from(assets)
      .innerJoin(memories, eq(memories.id, assets.memoryId))
      .where(eq(assets.id, assetId))
      .limit(1)
    return row ? this.toStoredAsset(row) : null
  }

  async getAssetByPathname(pathname: string): Promise<StoredAsset | null> {
    const [row] = await this.db
      .select({ asset: assets, spaceId: memories.spaceId, visibility: memories.visibility })
      .from(assets)
      .innerJoin(memories, eq(memories.id, assets.memoryId))
      .where(eq(assets.pathname, pathname))
      .limit(1)
    return row ? this.toStoredAsset(row) : null
  }

  async listAssetsForMemory(memoryId: string): Promise<StoredAsset[]> {
    const rows = await this.db
      .select({ asset: assets, spaceId: memories.spaceId, visibility: memories.visibility })
      .from(assets)
      .innerJoin(memories, eq(memories.id, assets.memoryId))
      .where(eq(assets.memoryId, memoryId))
      .orderBy(asc(assets.sortOrder))
    return rows.map((row) => this.toStoredAsset(row))
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    return this.db.transaction(async (transaction) => {
      const [asset] = await transaction
        .select({ memoryId: assets.memoryId })
        .from(assets)
        .where(eq(assets.id, assetId))
      if (!asset) return false
      await transaction
        .select({ id: memories.id })
        .from(memories)
        .where(eq(memories.id, asset.memoryId))
        .for('update')
      const [deleted] = await transaction
        .delete(assets)
        .where(eq(assets.id, assetId))
        .returning({ pathname: assets.pathname })
      if (!deleted) return false
      await transaction.insert(blobDeletions).values(deleted).onConflictDoNothing()
      return true
    })
  }

  async listBlobDeletions(): Promise<string[]> {
    return (
      await this.db
        .select({ pathname: blobDeletions.pathname })
        .from(blobDeletions)
        .orderBy(asc(blobDeletions.createdAt))
        .limit(100)
    ).map((row) => row.pathname)
  }
  async finishBlobDeletion(pathname: string): Promise<void> {
    await this.db.delete(blobDeletions).where(eq(blobDeletions.pathname, pathname))
  }
  async hitRateLimit(key: string, limit: number, windowMs: number, now: Date): Promise<number> {
    const [row] = await this.db
      .insert(rateLimits)
      .values({ key, hits: 1, expiresAt: new Date(now.getTime() + windowMs) })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          hits: sql`case when ${rateLimits.expiresAt} <= ${now} then 1 else least(${rateLimits.hits} + 1, ${limit + 1}) end`,
          expiresAt: sql`case when ${rateLimits.expiresAt} <= ${now} then ${new Date(now.getTime() + windowMs)} else ${rateLimits.expiresAt} end`
        }
      })
      .returning()
    return row.hits > limit
      ? Math.max(1, Math.ceil((row.expiresAt.getTime() - now.getTime()) / 1000))
      : 0
  }
  async pruneRateLimits(now: Date): Promise<void> {
    await this.db.delete(rateLimits).where(lt(rateLimits.expiresAt, now))
  }

  async listReminderCandidates(): Promise<ReminderCandidate[]> {
    const rows = await this.db
      .select({
        anniversaryId: anniversaries.id,
        title: anniversaries.title,
        originalDate: anniversaries.originalDate,
        reminderDays: anniversaries.reminderDays,
        spaceTitle: spaces.title,
        userId: users.id,
        email: users.email,
        displayName: users.displayName
      })
      .from(anniversaries)
      .innerJoin(spaces, eq(spaces.id, anniversaries.spaceId))
      .innerJoin(memberships, eq(memberships.spaceId, anniversaries.spaceId))
      .innerJoin(users, eq(users.id, memberships.userId))
      .orderBy(asc(anniversaries.id), asc(memberships.position))
    const grouped = new Map<string, ReminderCandidate>()
    for (const row of rows) {
      const candidate = grouped.get(row.anniversaryId) ?? {
        anniversaryId: row.anniversaryId,
        title: row.title,
        originalDate: row.originalDate,
        reminderDays: row.reminderDays,
        spaceTitle: row.spaceTitle,
        recipients: []
      }
      candidate.recipients.push({
        userId: row.userId,
        email: row.email,
        displayName: row.displayName
      })
      grouped.set(row.anniversaryId, candidate)
    }
    return [...grouped.values()]
  }

  async enqueueDelivery(key: ReminderDeliveryKey, message: MailMessage, now: Date): Promise<void> {
    await this.db
      .insert(notificationDeliveries)
      .values({ ...key, message, status: 'failed', createdAt: now, updatedAt: now })
      .onConflictDoNothing()
  }
  async listPendingDeliveries() {
    return this.db
      .select()
      .from(notificationDeliveries)
      .where(ne(notificationDeliveries.status, 'sent'))
      .orderBy(asc(notificationDeliveries.createdAt))
  }
  async claimDelivery(key: ReminderDeliveryKey, now: Date): Promise<string | null> {
    return await this.db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(notificationDeliveries)
        .where(
          and(
            eq(notificationDeliveries.anniversaryId, key.anniversaryId),
            eq(notificationDeliveries.userId, key.userId),
            eq(notificationDeliveries.occurrenceDate, key.occurrenceDate),
            eq(notificationDeliveries.kind, key.kind)
          )
        )
        .for('update')
        .limit(1)
      if (!existing || !existing.message || existing.status === 'sent') return null
      if (
        existing.firstAttemptAt &&
        now.getTime() - existing.firstAttemptAt.getTime() >= DELIVERY_RETRY_MS
      )
        return null
      if (
        existing.status === 'sending' &&
        now.getTime() - existing.updatedAt.getTime() < DELIVERY_LEASE_MS
      )
        return null
      const leaseToken = randomUUID()
      await transaction
        .update(notificationDeliveries)
        .set({
          status: 'sending',
          lastError: null,
          updatedAt: now,
          leaseToken,
          firstAttemptAt: existing.firstAttemptAt ?? now
        })
        .where(
          and(
            eq(notificationDeliveries.anniversaryId, key.anniversaryId),
            eq(notificationDeliveries.userId, key.userId),
            eq(notificationDeliveries.occurrenceDate, key.occurrenceDate),
            eq(notificationDeliveries.kind, key.kind)
          )
        )
      return leaseToken
    })
  }

  async finishDelivery(
    key: ReminderDeliveryKey,
    result: { error?: string },
    now: Date,
    leaseToken: string
  ): Promise<void> {
    await this.db
      .update(notificationDeliveries)
      .set({
        status: result.error ? 'failed' : 'sent',
        lastError: result.error ?? null,
        updatedAt: now
      })
      .where(
        and(
          eq(notificationDeliveries.anniversaryId, key.anniversaryId),
          eq(notificationDeliveries.userId, key.userId),
          eq(notificationDeliveries.occurrenceDate, key.occurrenceDate),
          eq(notificationDeliveries.kind, key.kind),
          eq(notificationDeliveries.leaseToken, leaseToken)
        )
      )
  }

  private async loadAssets(memoryIds: string[]): Promise<Map<string, MemoryAsset[]>> {
    const result = new Map<string, MemoryAsset[]>()
    if (memoryIds.length === 0) return result
    const rows = await this.db
      .select()
      .from(assets)
      .where(inArray(assets.memoryId, memoryIds))
      .orderBy(asc(assets.sortOrder))
    for (const row of rows) {
      const asset: MemoryAsset = {
        id: row.id,
        memoryId: row.memoryId,
        originalName: row.originalName,
        mimeType: row.mimeType,
        byteSize: row.byteSize,
        sortOrder: row.sortOrder,
        url: `/api/media/${row.id}`
      }
      result.set(row.memoryId, [...(result.get(row.memoryId) ?? []), asset])
    }
    return result
  }

  private toStoredAsset(row: {
    asset: AssetRow
    spaceId: string
    visibility: Visibility
  }): StoredAsset {
    return {
      id: row.asset.id,
      memoryId: row.asset.memoryId,
      pathname: row.asset.pathname,
      originalName: row.asset.originalName,
      mimeType: row.asset.mimeType,
      byteSize: row.asset.byteSize,
      sortOrder: row.asset.sortOrder,
      url: `/api/media/${row.asset.id}`,
      spaceId: row.spaceId,
      visibility: row.visibility
    }
  }

  private toMemory(
    row: typeof memories.$inferSelect,
    authorName: string,
    memoryAssets: MemoryAsset[]
  ): MemoryEntry {
    return {
      id: row.id,
      spaceId: row.spaceId,
      authorId: row.authorId,
      authorName,
      title: row.title,
      body: row.body,
      occurredOn: row.occurredOn,
      visibility: row.visibility,
      slug: row.slug,
      assets: memoryAssets,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }

  private toAnniversary(row: typeof anniversaries.$inferSelect): AnniversaryEntry {
    return {
      id: row.id,
      spaceId: row.spaceId,
      authorId: row.authorId,
      title: row.title,
      originalDate: row.originalDate,
      reminderDays: row.reminderDays,
      visibility: row.visibility,
      slug: row.slug,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    }
  }
}
