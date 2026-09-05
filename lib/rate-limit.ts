import { hashToken } from './security.js'
import { DomainError } from './errors.js'

export interface RateLimitStore {
  hitRateLimit(key: string, limit: number, windowMs: number, now: Date): Promise<number>
}
export class RateLimitError extends DomainError {
  constructor(public readonly retryAfter: number) {
    super('RATE_LIMITED', '请求过于频繁，请稍后重试', 429)
  }
}
export async function rateLimit(
  store: RateLimitStore,
  scope: string,
  identity: string,
  limit: number,
  windowMs: number
) {
  const retryAfter = await store.hitRateLimit(
    hashToken(`${scope}:${identity}`),
    limit,
    windowMs,
    new Date()
  )
  if (retryAfter) throw new RateLimitError(retryAfter)
}
