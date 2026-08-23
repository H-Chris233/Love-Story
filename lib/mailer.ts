export type MailKind = 'partner-invitation' | 'password-reset' | 'anniversary-reminder'

export interface MailMessage {
  to: string
  kind: MailKind
  subject: string
  html: string
  idempotencyKey?: string
}

export interface Mailer {
  send(message: MailMessage): Promise<void>
}
