<script setup>
import { ref } from 'vue';
import http from '../api/http.js';

/** @type {import('vue').Ref<string>} */
const healthResult = ref('');

/**
 * 调用健康检查接口，用于验证 Vite 代理是否打通。
 * @returns {Promise<void>}
 */
async function checkHealth() {
  const { data } = await http.get('/health');
  healthResult.value = JSON.stringify(data, null, 2);
}
</script>

<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <el-text tag="h1" size="large">TripMate Lite</el-text>
      </template>
      <p>点击下方按钮请求后端健康检查，确认开发代理可用。</p>
      <el-button type="primary" @click="checkHealth">检查 /api/health</el-button>
      <el-alert
        v-if="healthResult"
        class="health-result"
        type="success"
        :closable="false"
        title="健康检查结果"
        :description="healthResult"
      />
    </el-card>
  </div>
</template>

<style scoped>
.health-result {
  margin-top: 16px;
  white-space: pre-wrap;
}
</style>
