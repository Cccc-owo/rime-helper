<script setup lang="ts">
import type { RimeApp } from '@/types'

defineProps<{
  app: RimeApp
}>()
</script>

<template>
  <div class="card app-card">
    <div class="app-header">
      <div class="app-info">
        <div class="app-label">{{ app.label }}</div>
        <div class="app-package">{{ app.package }}</div>
      </div>
      <span class="badge badge-success" v-if="app.rime_dir_exists">已配置</span>
      <span class="badge badge-warning" v-else>未配置</span>
    </div>
    <div class="app-path">{{ app.rime_path }}</div>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.app-label {
  font-size: 16px;
  font-weight: 600;
}

.app-package {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.app-path {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
  font-family: monospace;
  word-break: break-all;
}
</style>
