export type ReminderKind = 'advance' | 'today'
import type { MailMessage } from '../mailer.js'
export const DELIVERY_LEASE_MS = 10 * 60 * 1000
export const DELIVERY_RETRY_MS = 23 * 60 * 60 * 1000
export interface PendingDelivery extends ReminderDeliveryKey {
  message: MailMessage | null
  firstAttemptAt: Date | null
}

export interface ReminderCandidate {
  anniversaryId: string
  title: string
  originalDate: string
  reminderDays: number
  spaceTitle: string
  recipients: Array<{ userId: string; email: string; displayName: string }>
}

export interface ReminderDeliveryKey {
  anniversaryId: string
  userId: string
  occurrenceDate: string
  kind: ReminderKind
}

export interface ReminderStore {
  listReminderCandidates(): Promise<ReminderCandidate[]>
  enqueueDelivery(key: ReminderDeliveryKey, message: MailMessage, now: Date): Promise<void>
  listPendingDeliveries(): Promise<PendingDelivery[]>
  claimDelivery(key: ReminderDeliveryKey, now: Date): Promise<string | null>
  finishDelivery(
    key: ReminderDeliveryKey,
    result: { error?: string },
    now: Date,
    leaseToken: string
  ): Promise<void>
}
