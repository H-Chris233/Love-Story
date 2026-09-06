import { describe, expect, it } from 'vitest'

import { renderEmail } from '../lib/email-template.js'

describe('email template', () => {
  it.each([undefined, { label: '接受邀请', url: 'https://love.example.com/invite/token?a=1&b=2' }])(
    'renders escaped content with inline styling and an optional action',
    (action) => {
      const html = renderEmail({
        title: '<img src=x onerror=alert(1)>',
        message: '小夏 & 阿川 <script>alert(1)</script>',
        note: '请勿转发 <b>私人链接</b>',
        action
      })
      const doc = new DOMParser().parseFromString(html, 'text/html')
      expect(doc.documentElement.lang).toBe('zh-CN')
      expect(doc.querySelector('h1')?.textContent).toBe('<img src=x onerror=alert(1)>')
      expect(doc.body.textContent).toContain('小夏 & 阿川 <script>alert(1)</script>')
      expect(doc.body.textContent).toContain('请勿转发 <b>私人链接</b>')
      expect(doc.querySelector('script, img, b, link, style')).toBeNull()
      expect(doc.querySelector('table')?.getAttribute('role')).toBe('presentation')
      expect(doc.querySelector('h1')?.style.fontSize).toBe('26px')
      const links = Array.from(doc.querySelectorAll('a'))
      expect(links).toHaveLength(action ? 2 : 0)
      if (action) {
        expect(links[0].textContent).toBe(action.label)
        expect(links[1].textContent).toBe(action.url)
        expect(links.every((link) => link.href === action.url)).toBe(true)
        expect(html).toContain('?a=1&amp;b=2')
      }
    }
  )

  it('rejects executable action URLs', () => {
    expect(() =>
      renderEmail({
        title: '邀请',
        message: '正文',
        note: '提示',
        action: { label: '打开', url: 'javascript:alert(1)' }
      })
    ).toThrow('Invalid email action URL')
  })
})
