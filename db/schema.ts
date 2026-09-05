import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core'

export const visibilityEnum = pgEnum('visibility', ['private', 'public'])
export const blobDeletions = pgTable('blob_deletions', {
  pathname: text('pathname').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})
export const rateLimits = pgTable('rate_limits', {
  key: varchar('key', { length: 64 }).primaryKey(),
  hits: integer('hits').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull()
})
export const deliveryKindEnum = pgEnum('delivery_kind', ['advance', 'today'])
export const deliveryStatusEnum = pgEnum('delivery_status', ['sending', 'sent', 'failed'])

export const spaces = pgTable(
  'spaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    singletonKey: integer('singleton_key').notNull().default(1),
    title: varchar('title', { length: 160 }).notNull(),
    intro: text('intro').notNull().default('把散落在时间里的温柔，慢慢装订成册。'),
    relationshipStartedAt: timestamp('relationship_started_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('spaces_singleton_idx').on(table.singletonKey),
    check('spaces_singleton_check', sql`${table.singletonKey} = 1`)
  ]
)

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 80 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [uniqueIndex('users_email_idx').on(table.email)]
)

export const memberships = pgTable(
  'memberships',
  {
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.spaceId, table.userId] }),
    uniqueIndex('memberships_user_idx').on(table.userId),
    uniqueIndex('memberships_space_position_idx').on(table.spaceId, table.position),
    check('memberships_position_check', sql`${table.position} in (1, 2)`)
  ]
)

export const sessions = pgTable(
  'sessions',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('sessions_user_idx').on(table.userId),
    index('sessions_expiry_idx').on(table.expiresAt)
  ]
)

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    invitedBy: uuid('invited_by')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 320 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('invitations_token_idx').on(table.tokenHash),
    index('invitations_space_email_idx').on(table.spaceId, table.email)
  ]
)

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    tokenHash: varchar('token_hash', { length: 64 }).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('password_reset_user_idx').on(table.userId)]
)

export const memories = pgTable(
  'memories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 160 }).notNull(),
    body: text('body').notNull(),
    occurredOn: date('occurred_on', { mode: 'string' }).notNull(),
    visibility: visibilityEnum('visibility').notNull().default('private'),
    slug: varchar('slug', { length: 220 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('memories_slug_idx').on(table.slug),
    index('memories_space_date_idx').on(table.spaceId, table.occurredOn)
  ]
)

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .notNull()
      .references(() => memories.id, { onDelete: 'cascade' }),
    pathname: text('pathname').notNull(),
    originalName: varchar('original_name', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 32 }).notNull(),
    byteSize: integer('byte_size').notNull(),
    sortOrder: integer('sort_order').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('assets_pathname_idx').on(table.pathname),
    uniqueIndex('assets_memory_order_idx').on(table.memoryId, table.sortOrder)
  ]
)

export const anniversaries = pgTable(
  'anniversaries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spaceId: uuid('space_id')
      .notNull()
      .references(() => spaces.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: varchar('title', { length: 160 }).notNull(),
    originalDate: date('original_date', { mode: 'string' }).notNull(),
    reminderDays: integer('reminder_days').notNull().default(7),
    visibility: visibilityEnum('visibility').notNull().default('private'),
    slug: varchar('slug', { length: 220 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('anniversaries_slug_idx').on(table.slug),
    index('anniversaries_space_idx').on(table.spaceId)
  ]
)

export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    anniversaryId: uuid('anniversary_id')
      .notNull()
      .references(() => anniversaries.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    occurrenceDate: date('occurrence_date', { mode: 'string' }).notNull(),
    kind: deliveryKindEnum('kind').notNull(),
    status: deliveryStatusEnum('status').notNull().default('sending'),
    providerMessageId: varchar('provider_message_id', { length: 160 }),
    message: jsonb('message').$type<import('../lib/mailer.js').MailMessage>(),
    leaseToken: uuid('lease_token'),
    firstAttemptAt: timestamp('first_attempt_at', { withTimezone: true }),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('notification_delivery_once_idx').on(
      table.anniversaryId,
      table.userId,
      table.occurrenceDate,
      table.kind
    )
  ]
)
