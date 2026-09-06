<template>
  <div class="auth-page">
    <aside class="auth-art">
      <RouterLink class="brand" to="/">
        <span class="brand__mark" aria-hidden="true">♥</span>
        <span>Love Story</span>
      </RouterLink>
      <img class="auth-art__image" src="/together-rabbits.png" alt="" width="320" height="320" />
      <h1>和你，<br />每一天都算数。</h1>
    </aside>
    <main class="auth-panel"><slot /></main>
  </div>
</template>
