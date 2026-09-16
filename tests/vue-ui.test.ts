import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VisibilityField from '../src/components/VisibilityField.vue'
import { ApiError, api } from '../src/services/api'
import MemoriesView from '../src/views/MemoriesView.vue'
import SetupView from '../src/views/SetupView.vue'
import DashboardView from '../src/views/DashboardView.vue'
import GalleryView from '../src/views/GalleryView.vue'
import SettingsView from '../src/views/SettingsView.vue'
import App from '../src/App.vue'
import { useSessionStore } from '../src/stores/session'
import { useNotificationStore } from '../src/stores/notification'
import { createAppRouter } from '../src/router/index'
import type { MemoryEntry } from '../src/types/domain'

describe('Vue application contracts', () => {
  it('keeps the couple and live timer central without decorative subtitles', async () => {
    const startedAt = '2024-01-13T00:00:00Z'
    vi.spyOn(Date, 'now').mockReturnValue(
      Date.parse(startedAt) + (966 * 86400 + 11 * 3600 + 24 * 60 + 59) * 1000
    )
    vi.spyOn(api, 'story').mockResolvedValue({
      space: {
        title: '我们的小窝',
        intro: '不再展示的首页副标题',
        relationshipStartedAt: startedAt
      },
      members: [
        { id: 'one', displayName: '小林' },
        { id: 'two', displayName: '小夏' }
      ],
      memories: [],
      anniversaries: []
    } as never)
    const wrapper = mount(DashboardView, { global: { stubs: { RouterLink: true } } })
    await flushPromises()
    expect(wrapper.get('h1').text()).toBe('我们的小窝')
    expect(wrapper.findAll('.couple-names__member').map((member) => member.text())).toEqual([
      '小林',
      '小夏'
    ])
    expect(wrapper.findAll('.timer__value').map((unit) => unit.text())).toEqual([
      '966',
      '11',
      '24',
      '59'
    ])
    expect(wrapper.text()).not.toContain('不再展示的首页副标题')
    expect(wrapper.find('.eyebrow').exists()).toBe(false)
    expect(wrapper.get('.together-card__art').attributes('src')).toBe('/together-rabbits.png')
    wrapper.unmount()
  })
  it.each([DashboardView, GalleryView])(
    'shows load failure and retries instead of displaying an empty state',
    async (view) => {
      if (view === GalleryView) {
        vi.spyOn(api, 'gallery')
          .mockRejectedValueOnce(new Error('offline'))
          .mockResolvedValue({ items: [], nextCursor: null })
      } else {
        vi.spyOn(api, 'story')
          .mockRejectedValueOnce(new Error('offline'))
          .mockResolvedValue({
            space: {
              title: '恢复成功',
              intro: '',
              relationshipStartedAt: '2024-01-01T00:00:00Z'
            },
            members: [],
            memories: []
          } as never)
      }
      const wrapper = mount(view, { global: { stubs: { RouterLink: true } } })
      await flushPromises()
      expect(wrapper.get('[role="alert"]').text()).toContain('暂时无法加载')
      expect(wrapper.find('.empty').exists()).toBe(false)
      await wrapper.get('button').trigger('click')
      await flushPromises()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('.empty').exists()).toBe(true)
      wrapper.unmount()
    }
  )
  it('does not cache a failed session request as an anonymous session', async () => {
    vi.spyOn(api, 'session')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ user: { id: 'member' }, space: {} } as never)
    const store = useSessionStore()
    await store.ensureLoaded()
    expect(store.loaded).toBe(false)
    expect(store.error).toBeTruthy()
    await store.ensureLoaded()
    expect(store.loaded).toBe(true)
    expect(store.error).toBe('')
    expect(store.isAuthenticated).toBe(true)
  })
  it('keeps a created memory when a photo fails and does not offer a duplicate submission', async () => {
    vi.spyOn(api, 'memories').mockResolvedValue({ items: [], nextCursor: null })
    const create = vi.spyOn(api, 'createMemory').mockResolvedValue({ id: 'created' } as never)
    vi.spyOn(api, 'uploadMemoryImage').mockRejectedValue(new Error('upload failed'))
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn()
    })
    const wrapper = mount(MemoriesView)
    await flushPromises()
    await wrapper.get('#memory-title').setValue('已经保存')
    await wrapper.get('#memory-body').setValue('正文')
    await wrapper.get('#memory-date').setValue('2025-01-01')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['bad'], 'bad.png', { type: 'image/png' })]
    })
    await input.trigger('change')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(create).toHaveBeenCalledOnce()
    expect(useNotificationStore().current).toMatchObject({
      tone: 'warning',
      message: expect.stringContaining('部分照片失败，可继续补传')
    })
    expect((wrapper.get('#memory-title').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('[aria-label="照片预览"]').exists()).toBe(false)
    wrapper.unmount()
  })
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('redirects an anonymous visitor away from private routes', async () => {
    vi.spyOn(api, 'session').mockRejectedValue(new ApiError('UNAUTHENTICATED', '请先登录', 401))
    window.scrollTo = vi.fn()
    const router = createAppRouter(createMemoryHistory())

    await router.push('/app/memories')
    await router.isReady()

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/app/memories')
  })

  it('does not load a session for public routes and keeps session failures on guarded routes', async () => {
    const session = vi.spyOn(api, 'session').mockRejectedValue(new Error('offline'))
    window.scrollTo = vi.fn()
    const router = createAppRouter(createMemoryHistory())
    await router.push('/story/public-slug')
    await router.isReady()
    expect(router.currentRoute.value.name).toBe('public-memory')
    expect(session).not.toHaveBeenCalled()

    await router.push('/app')
    expect(session).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(useSessionStore().error).toBeTruthy()
  })

  it('shows an explicit warning before content is published', async () => {
    const wrapper = mount(VisibilityField, { props: { modelValue: false } })
    await wrapper.get('input').setValue(true)
    expect(wrapper.get('[role="status"]').text()).toContain('任何拿到网站地址的人')
  })

  it('previews selected files and renders the empty memory state', async () => {
    vi.spyOn(api, 'memories').mockResolvedValue({ items: [], nextCursor: null })
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:preview'),
      revokeObjectURL: vi.fn()
    })
    const wrapper = mount(MemoriesView)
    await flushPromises()
    expect(wrapper.text()).toContain('时间线还是空白')

    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['image'], '海边.png', { type: 'image/png' })]
    })
    await input.trigger('change')
    expect(wrapper.get('img[alt="海边.png 预览"]').attributes('src')).toBe('blob:preview')
  })

  it('keeps loaded memories when loading more fails and allows a retry', async () => {
    const memory = (id: string): MemoryEntry => ({
      id,
      spaceId: 'space',
      authorId: 'author',
      authorName: '甲',
      title: id,
      body: '正文',
      occurredOn: '2025-01-01',
      visibility: 'private',
      slug: id,
      assets: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    vi.spyOn(api, 'memories')
      .mockResolvedValueOnce({ items: [memory('first')], nextCursor: 'next' })
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [memory('second')], nextCursor: null })
    const wrapper = mount(MemoriesView)
    await flushPromises()
    await wrapper.get('button.button--secondary:last-child').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('first')
    expect(wrapper.get('[role="alert"]').text()).toContain('暂时无法加载更多')
    await wrapper.get('button.button--secondary:last-child').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('second')
    expect(wrapper.text()).not.toContain('加载更多')
  })

  it('hides partner invitations after the second member joins', async () => {
    const session = useSessionStore()
    session.current = {
      user: { id: 'one', email: 'one@example.com', username: 'one' },
      space: {}
    } as never
    vi.spyOn(api, 'story').mockResolvedValue({
      space: {
        title: '两个人',
        intro: '',
        relationshipStartedAt: '2024-01-01T00:00:00.000Z'
      },
      members: [
        { id: 'one', displayName: '甲' },
        { id: 'two', displayName: '乙' }
      ],
      memories: []
    } as never)
    vi.spyOn(api, 'reminderStatus').mockResolvedValue([])
    const wrapper = mount(SettingsView)
    await flushPromises()
    expect(wrapper.text()).toContain('两位成员已加入')
    expect(wrapper.find('#settings-partner').exists()).toBe(false)
  })

  it('ignores a second submit while a memory write is pending', async () => {
    vi.spyOn(api, 'memories').mockResolvedValue({ items: [], nextCursor: null })
    let finish!: (value: never) => void
    const pending = new Promise<never>((resolve) => (finish = resolve))
    const create = vi.spyOn(api, 'createMemory').mockReturnValue(pending)
    const wrapper = mount(MemoriesView)
    await flushPromises()
    await wrapper.get('#memory-title').setValue('只保存一次')
    await wrapper.get('#memory-body').setValue('正文')
    await wrapper.get('#memory-date').setValue('2025-01-01')
    void wrapper.get('form').trigger('submit')
    await Promise.resolve()
    await wrapper.get('form').trigger('submit')
    expect(create).toHaveBeenCalledOnce()
    finish({ id: 'created' } as never)
    await flushPromises()
  })

  it('renders exactly one main landmark on public and authentication routes', async () => {
    vi.spyOn(api, 'publicMemory').mockResolvedValue({
      id: 'memory',
      spaceId: 'space',
      authorId: 'author',
      authorName: '甲',
      title: '公开回忆',
      body: '正文',
      occurredOn: '2025-01-01',
      visibility: 'public',
      slug: 'public',
      assets: [],
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z'
    })
    vi.spyOn(api, 'session').mockRejectedValue(new ApiError('UNAUTHENTICATED', '请先登录', 401))
    window.scrollTo = vi.fn()
    for (const path of ['/story/public', '/login']) {
      const pinia = createPinia()
      setActivePinia(pinia)
      const router = createAppRouter(createMemoryHistory())
      await router.push(path)
      await router.isReady()
      const wrapper = mount(App, { global: { plugins: [pinia, router] } })
      await flushPromises()
      expect(wrapper.findAll('main')).toHaveLength(1)
      wrapper.unmount()
    }
  })

  it('checks initialization status and renders server field errors', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    vi.spyOn(api, 'session').mockRejectedValue(new ApiError('UNAUTHENTICATED', '请先登录', 401))
    vi.spyOn(api, 'status').mockResolvedValue({ initialized: false })
    vi.spyOn(api, 'bootstrap').mockRejectedValue(
      new ApiError('VALIDATION_ERROR', '请检查表单', 400, { storyTitle: '此项为必填项' })
    )
    const router = createAppRouter(createMemoryHistory())
    await router.push('/setup')
    await router.isReady()
    const wrapper = mount(SetupView, { global: { plugins: [pinia, router] } })
    await flushPromises()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(api.status).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('此项为必填项')
  })
})
