import { defineConfig } from 'drizzle-kit'

const databaseUrl = process.env.DATABASE_URL

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  strict: true
})
