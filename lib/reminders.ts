import type { Mailer } from './mailer.js'
import type {
  PendingDelivery,
  ReminderIssueRecord,
  ReminderKind,
  ReminderStore
} from './store/reminder-store.js'
import { DELIVERY_RETRY_MS } from './store/reminder-store.js'
import { isLeapYear, parseCalendarDate } from './dates.js'
import { renderEmail } from './email-template.js'
import { DomainError, assertUuid } from './errors.js'
import type { Member, ReminderIssue, Space } from './types.js'

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

export function createReminderService(dependencies: {
  store: ReminderStore
  mailer: Mailer
  sleep?: (milliseconds: number) => Promise<void>
}) {
  const sleep =
    dependencies.sleep ??
    ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
  const expired = (delivery: PendingDelivery, now: Date) =>
    !!delivery.firstAttemptAt &&
    now.getTime() - delivery.firstAttemptAt.getTime() >= DELIVERY_RETRY_MS
  const view = (delivery: ReminderIssueRecord, now: Date): ReminderIssue => ({
    id: delivery.id,
    title: delivery.title,
    recipient: delivery.recipient,
    occurrenceDate: delivery.occurrenceDate,
    kind: delivery.kind,
    firstAttemptAt: delivery.firstAttemptAt?.toISOString() ?? null,
    status: expired(delivery, now) ? 'needsReview' : 'retryable'
  })

  async function assertMembership(member: Member, space: Space) {
    if (!(await dependencies.store.isMember(space.id, member.id))) {
      throw new DomainError('FORBIDDEN', '你无权访问这个空间', 403)
    }
  }

  return {
    async run(now = new Date()) {
      const today = getDateInTimeZone(now)
      const candidates = await dependencies.store.listReminderCandidates()
      let sent = 0

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
          await dependencies.store.enqueueDelivery(
            key,
            {
              to: recipient.email,
              kind: 'anniversary-reminder',
              subject: `${anniversary.title} · ${timing}`,
              html: renderEmail({
                title: `${anniversary.title} · ${timing}`,
                message: `${recipient.displayName}，记得为这个属于你们的日子留一点时间。`,
                note: `${anniversary.spaceTitle} · ${occurrenceDate}（北京时间）`
              }),
              idempotencyKey
            },
            now
          )
        }
      }
      for (const delivery of await dependencies.store.listPendingDeliveries()) {
        if (!delivery.message || expired(delivery, now)) continue
        const lease = await dependencies.store.claimDelivery(delivery, now)
        if (!lease) continue
        let error = true
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await dependencies.mailer.send(delivery.message)
            error = false
            break
          } catch {
            if (attempt < 2) await sleep(200 * (attempt + 1))
          }
        }
        if (error) {
          await dependencies.store.finishDelivery(
            delivery,
            { error: 'Delivery failed; retry with original payload' },
            now,
            lease
          )
          continue
        }
        // 落库失败保留 sending 租约；重试必须使用原邮件与幂等键。
        await dependencies.store.finishDelivery(delivery, {}, now, lease)
        sent++
      }
      const unresolved = await dependencies.store.listPendingDeliveries()
      const needsReview = unresolved.filter(
        (delivery) => !delivery.message || expired(delivery, now)
      ).length
      const failed = unresolved.length - needsReview
      return { sent, failed, needsReview }
    },
    async status(member: Member, space: Space, now = new Date()) {
      await assertMembership(member, space)
      return (await dependencies.store.listReminderIssues(space.id)).map((delivery) =>
        view(delivery, now)
      )
    },
    async retry(
      member: Member,
      space: Space,
      deliveryId: string,
      confirmDuplicateRisk: unknown,
      now = new Date()
    ) {
      await assertMembership(member, space)
      assertUuid(deliveryId, 'REMINDER_NOT_FOUND', '没有找到这条提醒记录')
      const delivery = await dependencies.store.getReminderIssue(space.id, deliveryId)
      if (!delivery?.message) {
        throw new DomainError('REMINDER_NOT_FOUND', '没有找到这条提醒记录', 404)
      }
      const needsReview = expired(delivery, now)
      if (needsReview && confirmDuplicateRisk !== true) {
        throw new DomainError(
          'DUPLICATE_RISK_CONFIRMATION_REQUIRED',
          '这次重试可能重复发送，请先确认风险',
          409
        )
      }
      const lease = await dependencies.store.claimDelivery(delivery, now, needsReview)
      if (!lease) throw new DomainError('DELIVERY_BUSY', '提醒正在处理，请稍后刷新', 409)
      try {
        await dependencies.mailer.send(delivery.message)
      } catch {
        await dependencies.store.finishDelivery(
          delivery,
          { error: 'Manual delivery failed; retry with original payload' },
          now,
          lease
        )
        throw new DomainError('DELIVERY_FAILED', '提醒发送失败，请稍后重试', 503)
      }
      await dependencies.store.finishDelivery(delivery, {}, now, lease)
      return { sent: true as const }
    }
  }
}
