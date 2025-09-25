import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { useUserStore } from '../stores/user'

// 定义路由配置类型
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (About.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    component: () => import('../views/AboutView.vue'),
  },
  {
    path: '/memories',
    name: 'memories',
    component: () => import('../views/MemoriesView.vue'),
  },
  {
    path: '/photos',
    name: 'photos',
    component: () => import('../views/PhotosView.vue'),
  },
  {
    path: '/anniversaries',
    name: 'anniversaries',
    component: () => import('../views/AnniversariesView.vue'),
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },

  {
    path: '/profile',
    name: 'profile',
    component: () => import('../views/ProfileView.vue'),
  },
  {
    path: '/admin',
    name: 'admin',
    component: () => import('../views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// Navigation guard for admin routes
router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  
  // Check if route requires admin access
  if (to.meta.requiresAdmin) {
    // If not logged in, redirect to login
    if (!userStore.isLoggedIn) {
      next('/login')
      return
    }
    
    // If user info not loaded, fetch it first
    if (!userStore.user && userStore.token) {
      try {
        await userStore.fetchUserProfile()
      } catch (error) {
        next('/login')
        return
      }
    }
    
    // Check if user is admin
    if (!userStore.user?.isAdmin) {
      next('/')
      return
    }
  }
  
  next()
})

export default router
