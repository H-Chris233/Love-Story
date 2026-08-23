import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'

import * as schema from './schema.js'

function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL
  if (!value) throw new Error('缺少必需环境变量 DATABASE_URL')
  return value
}

const globalDatabase = globalThis as typeof globalThis & {
  loveStoryPool?: Pool
  loveStoryDatabase?: ReturnType<typeof drizzle<typeof schema>>
}

export const pool = (globalDatabase.loveStoryPool ??= new Pool({
  connectionString: requireDatabaseUrl()
}))

export const database = (globalDatabase.loveStoryDatabase ??= drizzle(pool, { schema }))
