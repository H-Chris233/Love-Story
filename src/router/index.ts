import { createRouter, createWebHistory, type RouterHistory } from 'vue-router'

import { useSessionStore } from '@/stores/session'

export function createAppRouter(
  history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)
) {
  const router = createRouter({
    history,
    routes: [
      { path: '/', name: 'public-story', component: () => import('@/views/PublicStoryView.vue') },
      {
        path: '/story/:slug',
        name: 'public-memory',
        component: () => import('@/views/PublicMemoryView.vue')
      },
      {
        path: '/anniversary/:slug',
        name: 'public-anniversary',
        component: () => import('@/views/PublicAnniversaryView.vue')
      },
      {
        path: '/login',
        name: 'login',
        component: () => import('@/views/LoginView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: '/setup',
        name: 'setup',
        component: () => import('@/views/SetupView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: '/invite/:token',
        name: 'invite',
        component: () => import('@/views/InviteView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: '/forgot-password',
        name: 'forgot-password',
        component: () => import('@/views/ForgotPasswordView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: '/reset-password/:token',
        name: 'reset-password',
        component: () => import('@/views/ResetPasswordView.vue'),
        meta: { guestOnly: true }
      },
      {
        path: '/app',
        name: 'dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/app/memories',
        name: 'memories',
        component: () => import('@/views/MemoriesView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/app/gallery',
        name: 'gallery',
        component: () => import('@/views/GalleryView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/app/anniversaries',
        name: 'anniversaries',
        component: () => import('@/views/AnniversariesView.vue'),
        meta: { requiresAuth: true }
      },
      {
        path: '/app/settings',
        name: 'settings',
        component: () => import('@/views/SettingsView.vue'),
        meta: { requiresAuth: true }
      },
      { path: '/:pathMatch(.*)*', redirect: '/' }
    ],
    scrollBehavior: () => ({ top: 0 })
  })

  router.beforeEach(async (to) => {
    if (!to.meta.requiresAuth && !to.meta.guestOnly) return
    const session = useSessionStore()
    await session.ensureLoaded()
    if (session.error) return
    if (to.meta.requiresAuth && !session.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
    if (to.meta.guestOnly && session.isAuthenticated) return { name: 'dashboard' }
  })
  return router
}

const router = createAppRouter()
export default router
