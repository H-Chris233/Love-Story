import { expect, test, type BrowserContext } from '@playwright/test'
import { createTestApplication } from '../lib/testing/application.js'
import { getDateInTimeZone } from '../lib/reminders.js'

const origin = 'http://127.0.0.1:5173'
test('settings invitation feedback stays in the top-right viewport after scrolling', async ({
  page
}) => {
  const app = createTestApplication(origin)
  await app.auth.bootstrap({
    username: 'toast_owner',
    email: 'owner@example.com',
    partnerEmail: 'partner@example.com',
    displayName: '甲',
    password: 'secure-password',
    storyTitle: '通知测试',
    relationshipStartedAt: '2024-01-01T00:00:00Z'
  })
  await bridge(page.context(), app)
  await page.goto('/login')
  await page.getByLabel('用户名或邮箱').fill('toast_owner')
  await page.getByLabel('密码', { exact: true }).fill('secure-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '通知测试' })).toBeVisible()
  await page.goto('/app/settings')
  await page.getByLabel('伴侣邮箱').fill('partner@example.com')
  await page.getByRole('button', { name: '重新生成并发送邀请' }).click()
  const toast = page.locator('.notification-toast')
  await expect(toast).toContainText('邀请邮件已发送')
  const bounds = await toast.boundingBox()
  expect(bounds!.y).toBeLessThan(60)
  expect(Math.abs(page.viewportSize()!.width - bounds!.x - bounds!.width - 16)).toBeLessThan(2)
  await expect(page.locator('.private-main .notice')).toHaveCount(0)
  await page.screenshot({ path: test.info().outputPath('notification.png') })
  await page.getByRole('button', { name: '关闭通知' }).click()
  await expect(toast).toHaveCount(0)
})
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
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '创建我们的纪念簿' })).toBeVisible()
  await expect(page.locator('main')).toHaveCount(1)
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
  await page.getByLabel('用户名', { exact: true }).fill('owner_user')
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
    await partner.getByLabel('用户名', { exact: true }).fill('partner_user')
    await partner.getByLabel('受邀邮箱').fill('b@example.com')
    await partner.getByLabel('设置密码').fill('partner-password')
    await partner.getByRole('button', { name: '接受邀请' }).click()
    await expect(partner.getByRole('heading', { name: '山海之间' })).toBeVisible()
    await partner.goto(`${origin}/app/settings`)
    await expect(partner.getByText('两位成员已加入')).toBeVisible()
    await expect(partner.getByLabel('伴侣邮箱')).toHaveCount(0)
    await page.goto('/app/memories')
    await page.getByLabel('标题', { exact: true }).fill('海边')
    await page.getByLabel('发生日期').fill('2025-05-20')
    await page.getByLabel('故事', { exact: true }).fill('第一篇')
    await page.getByRole('button', { name: '保存回忆' }).evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
    })
    await expect(page.getByRole('heading', { name: '海边', exact: true })).toBeVisible()
    expect(app.store.state.memories).toHaveLength(1)
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
    await partner.getByLabel('用户名或邮箱').fill('partner_user')
    await partner.getByLabel('密码', { exact: true }).fill('changed-password')
    await partner.getByRole('button', { name: '登录', exact: true }).click()
    await expect(partner.getByRole('heading', { name: '山海之间' })).toBeVisible()
  } finally {
    await partnerContext.close()
    await visitorContext.close()
  }
})

test('loads private memories and gallery by page and exposes retryable reminder status', async ({
  page
}) => {
  const app = createTestApplication(origin)
  const owner = await app.auth.bootstrap({
    username: 'page_owner',
    email: 'owner@example.com',
    partnerEmail: 'partner@example.com',
    displayName: '甲',
    password: 'secure-password',
    storyTitle: '分页测试',
    relationshipStartedAt: '2024-01-01T00:00:00Z'
  })
  const memories = []
  for (let index = 0; index < 21; index++) {
    memories.push(
      await app.story.createMemory(owner.user, owner.space, {
        title: `回忆 ${index}`,
        body: '正文',
        occurredOn: '2025-01-01'
      })
    )
  }
  for (const [memoryIndex, memory] of memories.slice(0, 4).entries()) {
    for (let sortOrder = 0; sortOrder < 8; sortOrder++) {
      await app.store.createAsset({
        memoryId: memory.id,
        pathname: `gallery/${memoryIndex}/${sortOrder}`,
        originalName: `${memoryIndex}-${sortOrder}.png`,
        mimeType: 'image/png',
        byteSize: 8,
        sortOrder,
        now: new Date()
      })
    }
  }
  const anniversary = await app.story.createAnniversary(owner.user, owner.space, {
    title: '待重试提醒',
    originalDate: '2025-01-01'
  })
  await app.store.enqueueDelivery(
    {
      anniversaryId: anniversary.id,
      userId: owner.user.id,
      occurrenceDate: '2027-01-01',
      kind: 'advance'
    },
    {
      to: owner.user.email,
      subject: '标题',
      html: '正文',
      kind: 'anniversary-reminder',
      idempotencyKey: 'e2e-retry'
    },
    new Date()
  )
  await bridge(page.context(), app)
  await page.goto('/login')
  await page.getByLabel('用户名或邮箱').fill('page_owner')
  await page.getByLabel('密码', { exact: true }).fill('secure-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page.getByRole('heading', { name: '分页测试' })).toBeVisible()

  await page.goto('/app/memories')
  await expect(page.locator('article.memory-card')).toHaveCount(20)
  await page.getByRole('button', { name: '加载更多' }).click()
  await expect(page.locator('article.memory-card')).toHaveCount(21)

  await page.goto('/app/gallery')
  await expect(page.locator('.gallery figure')).toHaveCount(30)
  await page.getByRole('button', { name: '加载更多' }).click()
  await expect(page.locator('.gallery figure')).toHaveCount(32)

  await page.goto('/app/settings')
  await expect(page.getByRole('heading', { name: '待重试提醒' })).toBeVisible()
  await page.getByRole('button', { name: '重试发送' }).click()
  await expect(page.getByText('当前没有需要处理的提醒')).toBeVisible()
})
