import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useSessionStore } from './stores/session'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

window.addEventListener('love-story:unauthorized', () => {
  useSessionStore(pinia).clear()
  if (router.currentRoute.value.meta.requiresAuth) void router.push({ name: 'login' })
})

app.mount('#app')
