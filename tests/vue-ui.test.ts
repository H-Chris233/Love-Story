import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import VisibilityField from '../src/components/VisibilityField.vue'
import { ApiError, api } from '../src/services/api'
import MemoriesView from '../src/views/MemoriesView.vue'
import SetupView from '../src/views/SetupView.vue'
import { createAppRouter } from '../src/router/index'

describe('Vue application contracts', () => {
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

  it('shows an explicit warning before content is published', async () => {
    const wrapper = mount(VisibilityField, { props: { modelValue: false } })
    await wrapper.get('input').setValue(true)
    expect(wrapper.get('[role="status"]').text()).toContain('任何拿到网站地址的人')
  })

  it('previews selected files and renders the empty memory state', async () => {
    vi.spyOn(api, 'memories').mockResolvedValue([])
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
