import { ref } from 'vue'
import { ApiError } from '@/services/api'

export function useLoad(action: () => Promise<unknown>) {
  const loading = ref(true)
  const loadError = ref('')
  async function load() {
    loading.value = true
    loadError.value = ''
    try {
      await action()
    } catch (reason) {
      loadError.value =
        reason instanceof ApiError ? reason.message : '暂时无法加载，请检查网络后重试'
    } finally {
      loading.value = false
    }
  }
  return { loading, loadError, load }
}
