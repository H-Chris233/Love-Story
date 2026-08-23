export type ReminderKind = 'advance' | 'today'

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
  claimDelivery(key: ReminderDeliveryKey, now: Date): Promise<boolean>
  finishDelivery(key: ReminderDeliveryKey, result: { error?: string }, now: Date): Promise<void>
}
