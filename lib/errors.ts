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

export function assertRequired(value: unknown, field: string, max = 10000): string {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) {
    throw new DomainError('VALIDATION_ERROR', '请完整填写必填信息', 400, {
      [field]: '此项为必填项'
    })
  }
  if (normalized.length > max)
    throw new DomainError('VALIDATION_ERROR', '内容过长', 400, { [field]: `最多 ${max} 个字符` })
  return normalized
}

export function assertEmail(value: unknown, field: string): string {
  const email = assertRequired(value, field, 320).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new DomainError('VALIDATION_ERROR', '邮箱格式不正确', 400, { [field]: '请输入有效邮箱' })
  return email
}

export function assertPatch(
  value: unknown,
  fields: string[]
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !Object.keys(value).length ||
    Object.keys(value).some((key) => !fields.includes(key))
  ) {
    throw new DomainError('VALIDATION_ERROR', '更新字段无效', 400)
  }
}

export function assertUuid(value: string, code: string, message: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new DomainError(code, message, 404)
  }
  return value
}
