import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '../views/HomeView.vue'

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
    path: '/demo',
    name: 'demo',
    component: () => import('../views/RomanticDemoView.vue'),
  },
  {
    path: '/lightning-css-test',
    name: 'lightning-css-test',
    component: () => import('../views/LightningCSSTestView.vue'),
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
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
