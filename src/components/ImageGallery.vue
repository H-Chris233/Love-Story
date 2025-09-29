<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 定义图片数据类型
interface Image {
  id: number
  url: string
  title: string
}

// Props定义
const props = defineProps<{
  images: Image[]
}>()

// 引用PhotoSwipe组件
const pswpContainer = ref<HTMLElement | null>(null)

// 初始化图片查看器
const initPhotoSwipe = () => {
  // 这里会在后续实现中添加PhotoSwipe的初始化代码
  console.log('PhotoSwipe initialized with images:', props.images)
}

// 获取完整的图片URL
const getFullImageUrl = (imageUrl: string) => {
  // 如果URL已经是完整的URL，直接返回
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  
  // 在开发环境中，使用Vite代理，直接返回相对路径
  if (import.meta.env.DEV) {
    return imageUrl
  }
  
  // 构建基础API URL
  const isServerless = import.meta.env.VITE_USE_SERVERLESS_FUNCTIONS === 'true'
  const baseUrl = isServerless
    ? import.meta.env.VITE_SERVERLESS_API_URL || 'https://your-vercel-project.vercel.app/api'
    : import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  
  // 如果图片URL是/api/images/格式，需要特殊处理
  if (imageUrl.startsWith('/api/images/')) {
    // 直接使用基础URL构建图片URL
    return `${baseUrl.replace('/api', '')}/images/${imageUrl.split('/').pop()}`
  }
  
  // 如果图片URL已经是/api/格式，需要去掉/api并添加到基础URL
  if (imageUrl.startsWith('/api/')) {
    const serverUrl = baseUrl.replace('/api', '')
    return `${serverUrl}${imageUrl}`
  }
  
  // 在生产环境中，构建完整URL
  const serverUrl = baseUrl.replace('/api', '')
  return `${serverUrl}${imageUrl}`
}

// 组件挂载后初始化
onMounted(() => {
  initPhotoSwipe()
})
</script>

<template>
  <div class="romantic-grid romantic-grid-cols-1 romantic-grid-sm-cols-2 romantic-grid-md-cols-3 romantic-grid-lg-cols-4">
    <div 
      v-for="image in images" 
      :key="image.id"
      class="romantic-card gallery-card romantic-fade-in"
    >
      <div class="gallery-wrapper">
        <img 
          :src="getFullImageUrl(image.url)" 
          :alt="image.title"
          class="gallery-image"
        >
        <div class="gallery-overlay">
          <div class="gallery-info">
            <h3 class="gallery-title">{{ image.title }}</h3>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- PhotoSwipe容器 -->
  <div 
    ref="pswpContainer"
    class="pswp"
    tabindex="-1"
    role="dialog"
    aria-hidden="true"
  >
    <div class="pswp__bg"></div>
    <div class="pswp__scroll-wrap">
      <div class="pswp__container">
        <div class="pswp__item"></div>
        <div class="pswp__item"></div>
        <div class="pswp__item"></div>
      </div>
      <div class="pswp__ui pswp__ui--hidden">
        <div class="pswp__top-bar">
          <div class="pswp__counter"></div>
          <button class="pswp__button pswp__button--close" title="Close (Esc)"></button>
          <button class="pswp__button pswp__button--share" title="Share"></button>
          <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button>
          <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button>
          <div class="pswp__preloader">
            <div class="pswp__preloader__icn">
              <div class="pswp__preloader__cut">
                <div class="pswp__preloader__donut"></div>
              </div>
            </div>
          </div>
        </div>
        <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">
          <div class="pswp__share-tooltip"></div>
        </div>
        <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)"></button>
        <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)"></button>
        <div class="pswp__caption">
          <div class="pswp__caption__center"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 画廊卡片样式 */
.gallery-card {
  overflow: hidden;
  cursor: pointer;
  transition: var(--romantic-transition);
  border: 1px solid rgba(255, 107, 157, 0.1);
}

.gallery-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--romantic-shadow-hover);
}

.gallery-wrapper {
  position: relative;
  overflow: hidden;
}

.gallery-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
  transition: var(--romantic-transition);
}

.gallery-card:hover .gallery-image {
  transform: scale(1.05);
}

.gallery-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.1) 50%,
    rgba(0, 0, 0, 0.7) 100%
  );
  display: flex;
  align-items: flex-end;
  padding: var(--romantic-spacing-4);
  opacity: 0;
  transition: var(--romantic-transition);
}

.gallery-card:hover .gallery-overlay {
  opacity: 1;
}

.gallery-info {
  color: var(--romantic-white);
  transform: translateY(var(--romantic-spacing-3));
  transition: var(--romantic-transition);
}

.gallery-card:hover .gallery-info {
  transform: translateY(0);
}

.gallery-title {
  font-size: var(--romantic-font-size-lg);
  font-weight: var(--romantic-font-weight-semibold);
  line-height: var(--romantic-line-height-tight);
}

/* 添加动画延迟效果 */
.gallery-card:nth-child(1) { animation-delay: 0.1s; }
.gallery-card:nth-child(2) { animation-delay: 0.2s; }
.gallery-card:nth-child(3) { animation-delay: 0.3s; }
.gallery-card:nth-child(4) { animation-delay: 0.4s; }
.gallery-card:nth-child(5) { animation-delay: 0.5s; }
.gallery-card:nth-child(6) { animation-delay: 0.6s; }

/* 响应式设计 */
@media (max-width: 768px) {
  .gallery-image {
    height: 160px;
  }
  
  .gallery-title {
    font-size: var(--romantic-font-size-base);
  }
  
  .gallery-overlay {
    padding: var(--romantic-spacing-3);
  }
}

@media (max-width: 480px) {
  .gallery-image {
    height: 140px;
  }
  
  .gallery-title {
    font-size: var(--romantic-font-size-sm);
  }
  
  .gallery-overlay {
    padding: var(--romantic-spacing-2);
  }
}</style>

/* PhotoSwipe默认样式 */
.pswp {
  display: none;
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  overflow: hidden;
  -ms-touch-action: none;
  touch-action: none;
  z-index: 1500;
  -webkit-text-size-adjust: 100%;
  -webkit-backface-visibility: hidden;
  outline: none;
}

.pswp__bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: #000;
  opacity: 0;
  -webkit-transform: translateZ(0);
  transform: translateZ(0);
  -webkit-backface-visibility: hidden;
  will-change: opacity;
}

.pswp__scroll-wrap {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.pswp__container,
.pswp__item,
.pswp__zoom-wrap {
  -webkit-backface-visibility: hidden;
  will-change: transform;
}

.pswp__container,
.pswp__zoom-wrap {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
}

.pswp__item {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  overflow: hidden;
}

.pswp__img {
  position: absolute;
  width: auto;
  height: auto;
  top: 0;
  left: 0;
}

.pswp__ui {
  -webkit-font-smoothing: auto;
  visibility: visible;
  opacity: 1;
  z-index: 1550;
}

.pswp__top-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 44px;
  width: 100%;
}

.pswp__counter,
.pswp__button {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.pswp__button {
  width: 44px;
  height: 44px;
  position: relative;
  background: none;
  cursor: pointer;
  overflow: visible;
  -webkit-appearance: none;
  display: block;
  border: 0;
  padding: 0;
  margin: 0;
  float: right;
  opacity: 0.75;
  transition: opacity 0.2s;
  box-shadow: none;
}

.pswp__button:focus,
.pswp__button:hover {
  opacity: 1;
}

.pswp__button:active {
  outline: none;
  opacity: 0.9;
}

.pswp__button::-moz-focus-inner {
  padding: 0;
  border: 0;
}

/* 其他PhotoSwipe样式 */
</style>