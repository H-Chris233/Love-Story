import './assets/main.css'
import './assets/enhanced-romantic-theme.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// 检查是否应在当前页面显示 Eruda 调试面板
// 在 URL 中添加 ?debug=true 参数来启用 Eruda，或者在开发环境中默认启用
const shouldEnableEruda = () => {
  // 获取 URL 参数
  const urlParams = new URLSearchParams(window.location.search);
  const debugParam = urlParams.get('debug');
  
  // 如果 URL 中包含 ?debug=true 或 ?debug=1，则启用 Eruda
  if (debugParam === 'true' || debugParam === '1') {
    return true;
  }
  
  // 在所有环境中都启用 Eruda 调试面板
  return true;
};

// 动态导入并初始化 Eruda 调试工具
if (shouldEnableEruda()) {
  import('eruda').then(eruda => {
    // 初始化 Eruda 并进行一些基本配置
    eruda.default.init({
      // 可选配置
      tool: [
        'console', 
        'elements', 
        'network', 
        'resources', 
        'info', 
        'storage', 
        'source', 
        'settings'
      ],
      // 设置默认面板
      useShadowDom: true,
      // 保持在页面上的位置
      autoScale: true,
      // 自动调整大小
      defaults: {
        displaySize: 20,
        theme: 'Monokai',
        transparency: 0.9
      }
    });
    
    console.log('🔧 [ERUDA] Eruda debugging panel initialized');
    console.log('ℹ️ [ERUDA] Current mode:', import.meta.env.MODE);
    console.log('ℹ️ [ERUDA] Debug enabled via:', import.meta.env.DEV ? 'development mode' : 'URL parameter');
  }).catch(err => {
    console.warn('⚠️ [ERUDA] Failed to load Eruda debugging panel:', err);
  });
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
