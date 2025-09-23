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
  
  // 在生产环境中，构建完整URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
  const serverUrl = baseUrl.replace('/api', '')
  return `${serverUrl}${imageUrl}`
}

// 组件挂载后初始化
onMounted(() => {
  initPhotoSwipe()
})
</script>

<template>
  <div class="image-gallery">
    <div 
      v-for="image in images" 
      :key="image.id"
      class="image-wrapper"
    >
      <img 
        :src="getFullImageUrl(image.url)" 
        :alt="image.title"
        class="gallery-image"
      >
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
.image-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.image-wrapper {
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.3s ease;
}

.image-wrapper:hover {
  transform: translateY(-3px);
}

.gallery-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  display: block;
}

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