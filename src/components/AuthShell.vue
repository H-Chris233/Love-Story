<template>
  <div class="auth-page">
    <aside class="auth-art">
      <RouterLink class="brand" to="/">
        <span class="brand__mark" aria-hidden="true">L</span>
        <span>Love Story</span>
      </RouterLink>
      <h1>把相爱的日子，慢慢装订成册。</h1>
      <p>只属于两个人的温暖纪念簿</p>
    </aside>
    <main class="auth-panel"><slot /></main>
  </div>
</template>
