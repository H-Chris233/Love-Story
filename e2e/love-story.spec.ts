import { expect, test, type Page, type Route } from '@playwright/test'

interface TestMemory {
  id: string
  title: string
  body: string
  occurredOn: string
  visibility: 'private' | 'public'
  slug: string
}

async function installApi(
  page: Page,
  options: { initialized?: boolean; authenticated?: boolean } = {}
) {
  let initialized = options.initialized ?? false
  let authenticated = options.authenticated ?? false
  let title = '我们的山海日记'
  let startedAt = '2024-01-13T06:28:46.000Z'
  const memories: TestMemory[] = []
  const anniversaries: Array<{
    id: string
    spaceId: string
    authorId: string
    title: string
    originalDate: string
    reminderDays: number
    visibility: 'private' | 'public'
    slug: string
    createdAt: string
    updatedAt: string
  }> = []
  const user = {
    id: 'user-1',
    email: 'owner@example.com',
    displayName: '小夏',
    position: 1,
    createdAt: '2026-08-23T00:00:00.000Z'
  }
  const space = () => ({
    id: 'space-1',
    title,
    intro: '把散落在时间里的温柔，慢慢装订成册。',
    relationshipStartedAt: startedAt,
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z'
  })
  const memoryDto = (memory: TestMemory) => ({
    ...memory,
    spaceId: 'space-1',
    authorId: user.id,
    authorName: user.displayName,
    assets: [],
    createdAt: '2026-08-23T00:00:00.000Z',
    updatedAt: '2026-08-23T00:00:00.000Z'
  })
  const story = (publicOnly = false) => ({
    space: space(),
    members: [{ id: user.id, displayName: user.displayName }],
    memories: memories.filter((item) => !publicOnly || item.visibility === 'public').map(memoryDto),
    anniversaries
  })
  const data = (route: Route, value: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ data: value })
    })
  const failure = (route: Route, code: string, message: string, status: number) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code, message } })
    })

  await page.route('**/api/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    if (path === '/api/system/status') return data(route, { initialized })
    if (path === '/api/auth/session') {
      return authenticated
        ? data(route, { user, space: space() })
        : failure(route, 'UNAUTHENTICATED', '请先登录', 401)
    }
    if (path === '/api/auth/bootstrap' && method === 'POST') {
      const body = request.postDataJSON()
      initialized = true
      authenticated = true
      title = body.storyTitle
      startedAt = body.relationshipStartedAt
      return data(route, { user, space: space(), invitationDelivery: 'sent' })
    }
    if (path === '/api/auth/login' && method === 'POST') {
      authenticated = true
      return data(route, { user, space: space() })
    }
    if (path === '/api/auth/logout') {
      authenticated = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/auth/invitations/accept') {
      authenticated = true
      return data(route, {
        user: { ...user, id: 'user-2', position: 2, displayName: '阿川' },
        space: space()
      })
    }
    if (path === '/api/auth/invitations') return data(route, { invitationDelivery: 'sent' })
    if (path === '/api/auth/forgot-password') return data(route, { accepted: true })
    if (path === '/api/auth/reset-password') return route.fulfill({ status: 204 })
    if (path === '/api/public/story') {
      return initialized
        ? data(route, story(true))
        : failure(route, 'STORY_NOT_FOUND', '故事尚未开始', 404)
    }
    if (path === '/api/story') return data(route, story())
    if (path === '/api/memories' && method === 'GET') return data(route, memories.map(memoryDto))
    if (path === '/api/memories' && method === 'POST') {
      const body = request.postDataJSON()
      const memory = { id: `memory-${memories.length + 1}`, slug: 'first-memory', ...body }
      memories.unshift(memory)
      return data(route, memoryDto(memory))
    }
    if (path.startsWith('/api/memories/') && method === 'PATCH') {
      const memory = memories.find((item) => path.endsWith(item.id))!
      Object.assign(memory, request.postDataJSON())
      return data(route, memoryDto(memory))
    }
    if (path.startsWith('/api/memories/') && method === 'DELETE') {
      const index = memories.findIndex((item) => path.endsWith(item.id))
      memories.splice(index, 1)
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/anniversaries' && method === 'GET') return data(route, anniversaries)
    if (path === '/api/anniversaries' && method === 'POST') {
      const body = request.postDataJSON()
      const anniversary = {
        id: `anniversary-${anniversaries.length + 1}`,
        spaceId: 'space-1',
        authorId: user.id,
        slug: 'first-trip',
        createdAt: '2026-08-23T00:00:00.000Z',
        updatedAt: '2026-08-23T00:00:00.000Z',
        ...body
      }
      anniversaries.push(anniversary)
      return data(route, anniversary)
    }
    if (path.startsWith('/api/anniversaries/') && method === 'PATCH') {
      const item = anniversaries.find((candidate) => path.endsWith(candidate.id))!
      Object.assign(item, request.postDataJSON())
      return data(route, item)
    }
    if (path.startsWith('/api/anniversaries/') && method === 'DELETE') {
      const index = anniversaries.findIndex((candidate) => path.endsWith(candidate.id))
      anniversaries.splice(index, 1)
      return route.fulfill({ status: 204 })
    }
    return failure(route, 'NOT_FOUND', '未找到', 404)
  })
}

test('desktop and mobile complete the private-to-public story flow', async ({ page, isMobile }) => {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) {
      consoleErrors.push(message.text())
    }
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await installApi(page)
  await page.goto('/')
  await page.getByRole('link', { name: '创建纪念簿' }).click()
  await page.getByLabel('故事标题').fill('山海之间')
  await page.getByLabel('你的公开昵称').fill('小夏')
  await page.getByLabel('你的邮箱').fill('owner@example.com')
  await page.getByLabel('密码').fill('a-secure-password')
  await page.getByLabel('伴侣邮箱').fill('partner@example.com')
  await page.getByRole('button', { name: '创建纪念簿' }).click()
  await expect(page.getByRole('heading', { name: '山海之间' })).toBeVisible()

  if (isMobile) {
    await expect(page.getByRole('navigation', { name: '移动端主导航' })).toBeVisible()
  } else {
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible()
  }

  await page.goto('/app/memories')
  await page.getByLabel('标题').fill('海边的第一张合照')
  await page.getByLabel('发生日期').fill('2025-05-20')
  await page.getByLabel('故事', { exact: true }).fill('风很大，我们笑得也很大声。')
  await page.getByLabel('发布到访客故事页').check()
  await expect(page.getByRole('status')).toContainText('任何拿到网站地址的人')
  await page.getByRole('button', { name: '保存回忆' }).click()
  await expect(page.getByRole('heading', { name: '海边的第一张合照' })).toBeVisible()

  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: '改回私密' }).click()
  await expect(page.getByText('仅两人可见')).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { name: '山海之间' })).toBeVisible()
  await expect(page.getByText('还没有公开的回忆。')).toBeVisible()
  expect(consoleErrors).toEqual([])
  expect(pageErrors).toEqual([])
})

test('an invited partner manages shared content and completes password recovery', async ({
  page
}) => {
  await installApi(page, { initialized: true })
  await page.goto('/invite/one-time-token')
  await page.getByLabel('你的公开昵称').fill('阿川')
  await page.getByLabel('设置密码').fill('another-secure-password')
  await page.getByRole('button', { name: '接受邀请' }).click()
  await expect(page.getByRole('heading', { name: '我们的山海日记' })).toBeVisible()

  await page.goto('/app/anniversaries')
  await page.getByLabel('名称').fill('第一次旅行')
  await page.getByLabel('最初日期').fill('2024-01-08')
  await page.getByRole('button', { name: '保存纪念日' }).click()
  await expect(page.getByRole('heading', { name: '第一次旅行' })).toBeVisible()

  await page.getByRole('button', { name: '退出' }).click()
  await page.goto('/forgot-password')
  await page.getByLabel('邮箱').fill('partner@example.com')
  await page.getByRole('button', { name: '发送重置邮件' }).click()
  await expect(page.getByRole('heading', { name: '请检查邮箱' })).toBeVisible()

  await page.goto('/reset-password/reset-token')
  await page.getByLabel('新密码').fill('a-brand-new-password')
  await page.getByRole('button', { name: '保存新密码' }).click()
  await expect(page.getByRole('heading', { name: '密码已经更新' })).toBeVisible()
})
