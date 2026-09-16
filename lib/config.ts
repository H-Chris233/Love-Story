export function requireEnvironment(name: string, value = process.env[name]): string {
  if (!value) throw new Error(`缺少必需环境变量 ${name}`)
  return value
}

export function requireAppOrigin(value = process.env.APP_ORIGIN): string {
  if (!value) throw new Error('缺少必需环境变量 APP_ORIGIN')
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== value.replace(/\/+$/, '')) {
      throw new Error()
    }
    return url.origin
  } catch {
    throw new Error('环境变量 APP_ORIGIN 必须是有效的 HTTP(S) Origin')
  }
}
