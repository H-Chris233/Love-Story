import { escapeHtml } from './html.js'

export function renderEmail(input: {
  title: string
  message: string
  note: string
  action?: { label: string; url: string }
}): string {
  const title = escapeHtml(input.title)
  let action = ''
  if (input.action) {
    const url = new URL(input.action.url)
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Invalid email action URL')
    const href = escapeHtml(url.href)
    action = `
      <tr><td style="padding:24px 28px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td bgcolor="#ba2d55" style="border-radius:12px;mso-padding-alt:14px 24px;">
            <a href="${href}" style="display:inline-block;padding:14px 24px;border:1px solid #ba2d55;border-radius:12px;color:#ffffff;background-color:#ba2d55;font-size:16px;font-weight:bold;line-height:24px;text-decoration:none;">${escapeHtml(input.action.label)}</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:20px 28px 0;font-size:14px;line-height:22px;color:#80646e;word-break:break-all;">
        按钮无法打开？复制下方链接到浏览器：<br>
        <a href="${href}" style="color:#ba2d55;text-decoration:underline;">${href}</a>
      </td></tr>`
  }

  // 邮件客户端不依赖站点样式：表格布局和内联样式保留基本排版。
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:#fff0f4;color:#422b35;font-family:'Segoe UI','Microsoft YaHei',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff0f4">
    <tr><td align="center" style="padding:32px 12px;">
      <!--[if mso]><table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="padding:0 12px 20px;color:#ba2d55;font-size:20px;font-weight:bold;line-height:28px;"><span aria-hidden="true">♥</span>&nbsp; Love Story</td></tr>
        <tr><td bgcolor="#ffffff" style="border:1px solid #f0dfe5;border-top:4px solid #ce3a64;border-radius:20px;background-color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
            <tr><td style="padding:28px 28px 12px;word-wrap:break-word;overflow-wrap:anywhere;">
              <h1 style="margin:0;color:#422b35;font-size:26px;font-weight:bold;line-height:38px;">${title}</h1>
            </td></tr>
            <tr><td style="padding:0 28px;font-size:16px;line-height:28px;word-wrap:break-word;overflow-wrap:anywhere;">${escapeHtml(input.message)}</td></tr>
            ${action}
            <tr><td style="padding:24px 28px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td bgcolor="#fff0f4" style="padding:16px;border-radius:12px;color:#80646e;font-size:14px;line-height:24px;word-wrap:break-word;overflow-wrap:anywhere;">${escapeHtml(input.note)}</td>
              </tr></table>
            </td></tr>
          </table>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`
}
