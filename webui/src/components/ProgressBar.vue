<script setup lang="ts">
defineProps<{
  value: number
  max?: number
  label?: string
}>()
</script>

<template>
  <div class="progress-bar">
    <div class="progress-track">
      <div
        class="progress-fill"
        :style="{ width: `${Math.min(100, (value / (max || 100)) * 100)}%` }"
      ></div>
    </div>
    <span class="progress-label" v-if="label">{{ label }}</span>
  </div>
</template>

<style scoped>
.progress-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-label {
  font-size: 12px;
  color: var(--text-secondary);
  min-width: 40px;
  text-align: right;
}
</style>
