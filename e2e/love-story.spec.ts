import { expect, test, type BrowserContext } from '@playwright/test'
import { createTestApplication } from '../lib/testing/application.js'
import { getDateInTimeZone } from '../lib/reminders.js'

const origin = 'http://127.0.0.1:5173'
test('recovers failed initial session and setup checks without uncaught page errors', async ({
  page
}) => {
  const app = createTestApplication(origin)
  await bridge(page.context(), app)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  let failSession = true
  await page.route('**/api/auth/session', async (route) => {
    if (failSession) {
      failSession = false
      await route.fulfill({
        status: 503,
        json: { error: { code: 'UNAVAILABLE', message: '服务暂不可用' } }
      })
    } else await route.fallback()
  })
  await page.goto('/login')
  await expect(page.getByRole('alert')).toContainText('暂时无法连接服务')
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByRole('heading', { name: '回到我们的故事' })).toBeVisible()
  let failStatus = true
  await page.route('**/api/system/status', async (route) => {
    if (failStatus) {
      failStatus = false
      await route.fulfill({
        status: 503,
        json: { error: { code: 'UNAVAILABLE', message: '初始化检查暂不可用' } }
      })
    } else await route.fallback()
  })
  await page.goto('/setup')
  await expect(page.getByRole('alert')).toContainText('初始化检查暂不可用')
  await expect(page.getByRole('button', { name: '创建纪念簿' })).toHaveCount(0)
  await page.getByRole('button', { name: '重试' }).click()
  await expect(page.getByRole('button', { name: '创建纪念簿' })).toBeVisible()
  expect(errors).toEqual([])
})
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN9sAAAAASUVORK5CYII=',
  'base64'
)
async function bridge(context: BrowserContext, app: ReturnType<typeof createTestApplication>) {
  await context.route(`${origin}/api/**`, async (route) => {
    const req = route.request()
    const response = await app.handler(
      new Request(req.url(), {
        method: req.method(),
        headers: await req.allHeaders(),
        body: req.postData() ?? undefined
      })
    )
    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: Buffer.from(await response.arrayBuffer())
    })
  })
  await context.route('https://vercel.com/api/blob/**', async (route) => {
    const req = route.request()
    const cors = {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'PUT, OPTIONS',
      'access-control-allow-headers': req.headers()['access-control-request-headers'] ?? '*'
    }
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    const token = (await req.allHeaders()).authorization?.replace('Bearer ', '') ?? ''
    const allowed = app.tokens.get(token)
    const pathname = new URL(req.url()).searchParams.get('pathname')
    if (!allowed || allowed.pathname !== pathname)
      return route.fulfill({ status: 403, headers: cors })
    app.blob.objects.set(pathname, {
      bytes: new Uint8Array(req.postDataBuffer()!),
      contentType: allowed.type
    })
    app.tokens.delete(token)
    await route.fulfill({
      headers: cors,
      json: {
        pathname,
        url: `https://test.private.blob.vercel-storage.com/${pathname}`,
        contentType: allowed.type
      }
    })
  })
}

test('both members edit shared memories and photos; anonymous access and reminders obey real handlers', async ({
  page,
  browser,
  isMobile
}) => {
  const app = createTestApplication(origin)
  await bridge(page.context(), app)
  await page.goto('/setup')
  await page.getByLabel('故事标题').fill('山海之间')
  await page.getByLabel('你的公开昵称').fill('甲')
  await page.getByLabel('你的邮箱').fill('a@example.com')
  await page.getByLabel('密码', { exact: true }).fill('secure-password')
  await page.getByLabel('伴侣邮箱').fill('b@example.com')
  await page.getByRole('button', { name: '创建纪念簿' }).click()
  await expect(page.getByRole('heading', { name: '山海之间' })).toBeVisible()
  const partnerContext = await browser.newContext({ viewport: page.viewportSize(), isMobile })
  const visitorContext = await browser.newContext({ viewport: page.viewportSize(), isMobile })
  await bridge(partnerContext, app)
  await bridge(visitorContext, app)
  const partner = await partnerContext.newPage()
  const visitor = await visitorContext.newPage()
  try {
    const invite = /invite\/([^"<]+)/.exec(app.mailer.messages[0].html)![1]
    await partner.goto(`${origin}/invite/${invite}`)
    await partner.getByLabel('你的公开昵称').fill('乙')
    await partner.getByLabel('设置密码').fill('partner-password')
    await partner.getByRole('button', { name: '接受邀请' }).click()
    await expect(partner.getByRole('heading', { name: '山海之间' })).toBeVisible()
    await page.goto('/app/memories')
    await page.getByLabel('标题', { exact: true }).fill('海边')
    await page.getByLabel('发生日期').fill('2025-05-20')
    await page.getByLabel('故事', { exact: true }).fill('第一篇')
    await page.getByRole('button', { name: '保存回忆' }).click()
    await expect(page.getByRole('heading', { name: '海边', exact: true })).toBeVisible()
    await partner.goto(`${origin}/app/memories`)
    await partner.getByRole('button', { name: '编辑回忆' }).click()
    await partner.getByLabel('编辑标题').fill('海边新篇')
    await partner.getByLabel('编辑故事').fill('一起修改')
    await partner.getByLabel('编辑日期').fill('2025-05-21')
    await partner.getByRole('button', { name: '保存修改' }).click()
    await expect(partner.getByRole('heading', { name: '海边新篇' })).toBeVisible()
    await partner
      .getByLabel(/补传照片/)
      .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: png })
    await expect(partner.getByAltText('photo.png')).toBeVisible()
    const memory = app.store.state.memories[0]
    const asset = memory.assets[0]
    const read = async (path: string) =>
      visitor.evaluate(async (path) => {
        const response = await fetch(path)
        return response.status
      }, path)
    await visitor.goto(origin)
    expect(await read(`/api/media/${asset.id}`)).toBe(404)
    partner.once('dialog', (dialog) => dialog.accept())
    await partner.getByRole('button', { name: '公开', exact: true }).click()
    await expect(partner.getByText('已公开')).toBeVisible()
    await visitor.goto(`${origin}/story/${memory.slug}`)
    await expect(visitor.getByRole('heading', { name: '海边新篇' })).toBeVisible()
    expect(await read(`/api/media/${asset.id}`)).toBe(200)
    await partner.getByRole('button', { name: '改回私密' }).click()
    await expect(partner.getByText('仅两人可见')).toBeVisible()
    expect(await read(`/api/public/memories/${memory.slug}`)).toBe(404)
    expect(await read(`/api/media/${asset.id}`)).toBe(404)
    partner.once('dialog', (dialog) => dialog.accept())
    await partner.getByRole('button', { name: '删除照片 photo.png', exact: true }).click()
    await expect(partner.getByAltText('photo.png')).toHaveCount(0)
    await page.goto('/app/anniversaries')
    await page.getByLabel('名称', { exact: true }).fill('相遇')
    await page.getByLabel('最初日期', { exact: true }).fill(getDateInTimeZone(new Date()))
    await page.getByRole('button', { name: '保存纪念日' }).click()
    await expect(page.getByRole('heading', { name: '相遇', exact: true })).toBeVisible()
    await partner.goto(`${origin}/app/anniversaries`)
    await partner.getByRole('button', { name: '编辑纪念日' }).click()
    await partner.getByLabel('编辑名称').fill('相遇纪念')
    await partner.getByLabel('编辑提前提醒天数').fill('3')
    await partner.getByRole('button', { name: '保存修改' }).click()
    await expect(partner.getByRole('heading', { name: '相遇纪念' })).toBeVisible()
    partner.once('dialog', (dialog) => dialog.accept())
    await partner.getByRole('button', { name: '公开', exact: true }).click()
    await expect(partner.getByText('已公开')).toBeVisible()
    const anniversary = app.store.state.anniversaries[0]
    await visitor.goto(`${origin}/anniversary/${anniversary.slug}`)
    await expect(visitor.getByRole('heading', { name: '相遇纪念' })).toBeVisible()
    await partner.getByRole('button', { name: '改回私密' }).click()
    await expect(partner.getByText('私密', { exact: true })).toBeVisible()
    expect(await read(`/api/public/anniversaries/${anniversary.slug}`)).toBe(404)
    for (let i = 0; i < 2; i++)
      expect(
        (
          await app.handler(
            new Request(`${origin}/api/cron/reminders`, {
              headers: { authorization: 'Bearer test-cron' }
            })
          )
        ).status
      ).toBe(200)
    expect(
      app.mailer.messages.filter((message) => message.kind === 'anniversary-reminder')
    ).toHaveLength(2)
    partner.once('dialog', (dialog) => dialog.accept())
    await partner.getByRole('button', { name: '删除', exact: true }).click()
    await expect(partner.getByText('还没有纪念日')).toBeVisible()
    await page.goto('/app/memories')
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: '删除', exact: true }).click()
    await expect(page.getByText('时间线还是空白')).toBeVisible()
    await partner.goto(`${origin}/app/memories`)
    await partner.getByLabel('标题', { exact: true }).fill('乙的回忆')
    await partner.getByLabel('故事', { exact: true }).fill('另一位成员写下的故事')
    await partner.getByLabel('发生日期').fill('2025-05-22')
    await partner.getByRole('button', { name: '保存回忆' }).click()
    await expect(partner.getByRole('heading', { name: '乙的回忆' })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: '编辑回忆' }).click()
    await page.getByLabel('编辑标题').fill('甲修改的回忆')
    await page.getByRole('button', { name: '保存修改' }).click()
    await expect(page.getByRole('heading', { name: '甲修改的回忆' })).toBeVisible()
    await partner.goto(`${origin}/app/anniversaries`)
    await partner.getByLabel('名称', { exact: true }).fill('乙的纪念日')
    await partner.getByLabel('最初日期', { exact: true }).fill('2025-01-01')
    await partner.getByRole('button', { name: '保存纪念日' }).click()
    await expect(partner.getByRole('heading', { name: '乙的纪念日' })).toBeVisible()
    await page.goto('/app/anniversaries')
    await page.getByRole('button', { name: '编辑纪念日' }).click()
    await page.getByLabel('编辑名称').fill('甲修改的纪念日')
    await page.getByRole('button', { name: '保存修改' }).click()
    await expect(page.getByRole('heading', { name: '甲修改的纪念日' })).toBeVisible()
    await visitor.goto(`${origin}/app/memories`)
    await expect(visitor).toHaveURL(/login/)
    await visitor.goto(`${origin}/forgot-password`)
    await visitor.getByLabel('邮箱').fill('b@example.com')
    await visitor.getByRole('button', { name: '发送重置邮件' }).click()
    await expect(visitor.getByRole('heading', { name: '请检查邮箱' })).toBeVisible()
    const reset = /reset-password\/([^"<]+)/.exec(app.mailer.messages.at(-1)!.html)![1]
    await visitor.goto(`${origin}/reset-password/${reset}`)
    await visitor.getByLabel('新密码').fill('changed-password')
    await visitor.getByRole('button', { name: '保存新密码' }).click()
    await expect(visitor.getByRole('heading', { name: '密码已经更新' })).toBeVisible()
    await partner.goto(`${origin}/app`)
    await expect(partner).toHaveURL(/login/)
  } finally {
    await partnerContext.close()
    await visitorContext.close()
  }
})
