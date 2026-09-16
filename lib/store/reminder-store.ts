export type ReminderKind = 'advance' | 'today'
import type { MailMessage } from '../mailer.js'
export const DELIVERY_LEASE_MS = 10 * 60 * 1000
export const DELIVERY_RETRY_MS = 23 * 60 * 60 * 1000
export interface PendingDelivery extends ReminderDeliveryKey {
  id: string
  status: 'sending' | 'failed' | 'sent'
  message: MailMessage | null
  firstAttemptAt: Date | null
}

export interface ReminderIssueRecord extends PendingDelivery {
  title: string
  recipient: string
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
  isMember(spaceId: string, userId: string): Promise<boolean>
  listReminderCandidates(): Promise<ReminderCandidate[]>
  enqueueDelivery(key: ReminderDeliveryKey, message: MailMessage, now: Date): Promise<void>
  listPendingDeliveries(): Promise<PendingDelivery[]>
  listReminderIssues(spaceId: string): Promise<ReminderIssueRecord[]>
  getReminderIssue(spaceId: string, deliveryId: string): Promise<ReminderIssueRecord | null>
  claimDelivery(key: ReminderDeliveryKey, now: Date, allowExpired?: boolean): Promise<string | null>
  finishDelivery(
    key: ReminderDeliveryKey,
    result: { error?: string },
    now: Date,
    leaseToken: string
  ): Promise<void>
}
