import { Resend } from 'resend'

import type { Mailer } from './mailer.js'

function requireEnvironment(name: 'RESEND_API_KEY' | 'EMAIL_FROM'): string {
  const value = process.env[name]
  if (!value) throw new Error(`缺少必需环境变量 ${name}`)
  return value
}

export function createResendMailer(): Mailer {
  const resend = new Resend(requireEnvironment('RESEND_API_KEY'))
  const from = requireEnvironment('EMAIL_FROM')
  return {
    async send(message) {
      const { error } = await resend.emails.send(
        {
          from,
          to: message.to,
          subject: message.subject,
          html: message.html
        },
        message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined
      )
      if (error) throw new Error(error.message)
    }
  }
}
