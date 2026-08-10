<script setup>
/**
 * 应用整体布局：顶部品牌导航、居中内容区、底部版权。
 */
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="app-header__inner">
        <div class="brand">
          <div class="brand__name">TripMate Lite</div>
          <div class="brand__sub">AI 个人旅行助手</div>
        </div>
        <nav class="nav">
          <router-link class="nav__link" to="/trips">行程列表</router-link>
          <router-link class="nav__link" to="/assistant">AI 助手</router-link>
        </nav>
      </div>
    </header>

    <main class="app-main">
      <router-view />
    </main>

    <footer class="app-footer">
      <span>© 2026 TripMate Lite · AI 个人旅行助手 MVP</span>
    </footer>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f3faf8 0%, #eef6f4 55%, #f7faf9 100%);
}

.app-header {
  background: linear-gradient(90deg, #0e9f8e 0%, #14b8a6 100%);
  color: #fff;
  box-shadow: 0 8px 24px rgba(14, 159, 142, 0.22);
}

.app-header__inner {
  max-width: 1100px;
  margin: 0 auto;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand__name {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.brand__sub {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.9;
}

.nav {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.nav__link {
  color: rgba(255, 255, 255, 0.92);
  text-decoration: none;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.nav__link:hover {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.nav__link.router-link-active {
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-weight: 600;
}

.app-main {
  flex: 1;
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 20px 40px;
  box-sizing: border-box;
}

.app-footer {
  text-align: center;
  padding: 16px 20px 24px;
  color: #7a8f8b;
  font-size: 13px;
}
</style>
