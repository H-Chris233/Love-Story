import type { Mailer } from './mailer.js'
import type { ReminderKind, ReminderStore } from './store/reminder-store.js'
import { DELIVERY_RETRY_MS } from './store/reminder-store.js'
import { isLeapYear, parseCalendarDate } from './dates.js'
import { escapeHtml } from './html.js'

function parseDate(value: string): { year: number; month: number; day: number } {
  return parseCalendarDate(value)
}

function occurrenceForYear(originalDate: string, year: number): string {
  const { month, day } = parseDate(originalDate)
  const normalizedDay = month === 2 && day === 29 && !isLeapYear(year) ? 28 : day
  return `${year}-${String(month).padStart(2, '0')}-${String(normalizedDay).padStart(2, '0')}`
}

export function getNextAnniversary(originalDate: string, today: string): string {
  const { year } = parseDate(today)
  const thisYear = occurrenceForYear(originalDate, year)
  return thisYear >= today ? thisYear : occurrenceForYear(originalDate, year + 1)
}

export function getDateInTimeZone(now: Date, timeZone = 'Asia/Shanghai'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

function daysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`)
  const end = Date.parse(`${to}T00:00:00.000Z`)
  return Math.round((end - start) / (24 * 60 * 60 * 1000))
}

export function createReminderService(dependencies: { store: ReminderStore; mailer: Mailer }) {
  return {
    async run(now = new Date()) {
      const today = getDateInTimeZone(now)
      const candidates = await dependencies.store.listReminderCandidates()
      let sent = 0
      let failed = 0
      let needsReview = 0

      for (const anniversary of candidates) {
        const occurrenceDate = getNextAnniversary(anniversary.originalDate, today)
        const remaining = daysBetween(today, occurrenceDate)
        const kind: ReminderKind | null =
          remaining === 0
            ? 'today'
            : remaining === anniversary.reminderDays && anniversary.reminderDays > 0
              ? 'advance'
              : null
        if (!kind) continue

        for (const recipient of anniversary.recipients) {
          const key = {
            anniversaryId: anniversary.anniversaryId,
            userId: recipient.userId,
            occurrenceDate,
            kind
          }
          const idempotencyKey = [
            'anniversary',
            anniversary.anniversaryId,
            recipient.userId,
            occurrenceDate,
            kind
          ].join(':')
          const timing = kind === 'today' ? '就是今天' : `还有 ${remaining} 天`
          const safeName = escapeHtml(recipient.displayName)
          const safeTitle = escapeHtml(anniversary.title)
          const safeSpaceTitle = escapeHtml(anniversary.spaceTitle)
          await dependencies.store.enqueueDelivery(
            key,
            {
              to: recipient.email,
              kind: 'anniversary-reminder',
              subject: `${anniversary.title} · ${timing}`,
              html: `<p>${safeName}，你们的「${safeTitle}」${timing}。</p><p>愿「${safeSpaceTitle}」继续收下每一份温柔。</p>`,
              idempotencyKey
            },
            now
          )
        }
      }
      for (const delivery of await dependencies.store.listPendingDeliveries()) {
        if (
          !delivery.message ||
          (delivery.firstAttemptAt &&
            now.getTime() - delivery.firstAttemptAt.getTime() >= DELIVERY_RETRY_MS)
        ) {
          needsReview++
          continue
        }
        const lease = await dependencies.store.claimDelivery(delivery, now)
        if (!lease) continue
        try {
          await dependencies.mailer.send(delivery.message)
        } catch {
          await dependencies.store.finishDelivery(
            delivery,
            { error: 'Delivery failed; retry with original payload' },
            now,
            lease
          )
          failed++
          continue
        }
        // 落库失败保留 sending 租约；重试必须使用原邮件与幂等键。
        await dependencies.store.finishDelivery(delivery, {}, now, lease)
        sent++
      }
      return { sent, failed, needsReview }
    }
  }
}
