import type { Mailer, MailMessage } from '../mailer.js'

export interface RecordingMailer extends Mailer {
  messages: MailMessage[]
}

export function createRecordingMailer(): RecordingMailer {
  const messages: MailMessage[] = []
  return {
    messages,
    async send(message) {
      messages.push(message)
    }
  }
}
