import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import NotificationToast from '../src/components/NotificationToast.vue'
import SettingsView from '../src/views/SettingsView.vue'
import { useNotificationStore } from '../src/stores/notification'
import { api } from '../src/services/api'

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('restarts the timeout for a new message, pauses on hover/focus, and supports dismissal', async () => {
  const wrapper = mount(NotificationToast, { global: { stubs: { teleport: true } } })
  const store = useNotificationStore()
  store.show('已发送')
  await nextTick()
  await vi.advanceTimersByTimeAsync(4000)
  store.show('已保存')
  await nextTick()
  await vi.advanceTimersByTimeAsync(2000)
  expect(wrapper.text()).toContain('已保存')
  await wrapper.get('.notification-toast').trigger('mouseenter')
  await vi.advanceTimersByTimeAsync(10000)
  expect(store.current).not.toBeNull()
  await wrapper.get('.notification-toast').trigger('mouseleave')
  await wrapper.get('.notification-toast').trigger('focusin')
  await vi.advanceTimersByTimeAsync(10000)
  expect(store.current).not.toBeNull()
  await wrapper.get('.notification-toast').trigger('focusout', { relatedTarget: null })
  await vi.advanceTimersByTimeAsync(5000)
  expect(store.current).toBeNull()
  store.show('发送失败', 'error')
  await nextTick()
  await vi.advanceTimersByTimeAsync(5000)
  expect(wrapper.text()).toContain('发送失败')
  await wrapper.get('button[aria-label="关闭通知"]').trigger('click')
  expect(store.current).toBeNull()
  store.show('最后一条')
  await nextTick()
  await vi.advanceTimersByTimeAsync(5000)
  expect(store.current).toBeNull()
  wrapper.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('shows settings invitation results in the global toast, not the settings layout', async () => {
  vi.useRealTimers()
  vi.spyOn(api, 'story').mockResolvedValue({
    space: { title: '标题', intro: '', relationshipStartedAt: '2024-01-01T00:00:00Z' },
    members: [{ id: 'one', displayName: '甲' }],
    memories: []
  } as never)
  vi.spyOn(api, 'reminderStatus').mockResolvedValue([])
  vi.spyOn(api, 'invitePartner').mockResolvedValue({ invitationDelivery: 'sent' })
  const pinia = createPinia()
  const host = mount(NotificationToast, { global: { plugins: [pinia] } })
  const page = mount(SettingsView, { global: { plugins: [pinia] } })
  await flushPromises()
  await page.get('#settings-partner').setValue('partner@example.com')
  await page.findAll('form').at(-1)!.trigger('submit')
  await flushPromises()
  expect(api.invitePartner).toHaveBeenCalledWith('partner@example.com')
  expect(useNotificationStore(pinia).current?.message).toContain('邀请邮件已发送')
  await nextTick()
  expect(page.text()).not.toContain('邀请邮件已发送')
  expect(document.body.querySelector('.notification-toast')?.textContent).toContain(
    '邀请邮件已发送'
  )
  page.unmount()
  expect(document.body.querySelector('.notification-toast')?.textContent).toContain(
    '邀请邮件已发送'
  )
  host.unmount()
})
