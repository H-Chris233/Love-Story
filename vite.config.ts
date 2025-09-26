import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Set NODE_ENV based on the mode
  process.env.NODE_ENV = mode === 'production' ? 'production' : 'development'
  
  return {
  plugins: [
    vue(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Love Story',
        short_name: 'LoveStory',
        description: '记录我们的爱情故事',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'src/assets/logo.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'src/assets/logo.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        // For Vercel dev server, target should be the same port where vercel runs functions
        // In most cases this will be the same port as the Vite dev server when using vercel dev
        target: process.env.API_TARGET || 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: {
        chrome: 80,
        firefox: 70,
        safari: 13,
        edge: 80
      }
    }
  }
}})
