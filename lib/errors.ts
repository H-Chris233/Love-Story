export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
    public readonly fields?: Record<string, string>
  ) {
    super(message)
    this.name = 'DomainError'
  }
}

export function assertRequired(value: string, field: string): string {
  const normalized = value.trim()
  if (!normalized) {
    throw new DomainError('VALIDATION_ERROR', '请完整填写必填信息', 400, {
      [field]: '此项为必填项'
    })
  }
  return normalized
}

export function assertUuid(value: string, code: string, message: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new DomainError(code, message, 404)
  }
  return value
}
