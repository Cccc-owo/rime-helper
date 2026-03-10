<script setup lang="ts">
import type { UpdateCheckResult } from '@/types'

defineProps<{
  item: UpdateCheckResult
  updating?: boolean
}>()

const emit = defineEmits<{
  update: []
}>()
</script>

<template>
  <div class="card update-card">
    <div class="update-header">
      <div class="update-name">{{ item.id }}</div>
      <span class="badge badge-warning" v-if="item.has_update">有更新</span>
      <span class="badge badge-success" v-else>最新</span>
    </div>
    <div class="update-versions">
      <span>当前: {{ item.current || '未安装' }}</span>
      <span v-if="item.latest">最新: {{ item.latest }}</span>
    </div>
    <div class="update-actions" v-if="item.has_update">
      <button class="btn btn-primary btn-block" :disabled="updating" @click="emit('update')">
        {{ updating ? '更新中...' : '更新' }}
      </button>
    </div>
    <div class="update-error" v-if="item.error">{{ item.error }}</div>
  </div>
</template>

<style scoped>
.update-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.update-name {
  font-size: 16px;
  font-weight: 600;
}

.update-versions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

.update-actions {
  margin-top: 12px;
}

.update-error {
  margin-top: 8px;
  font-size: 12px;
  color: var(--error);
}
</style>
