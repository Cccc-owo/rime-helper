<script setup lang="ts">
withDefaults(defineProps<{
  message?: string
  error?: string
}>(), {
  message: '',
  error: '',
})
</script>

<template>
  <div v-if="error" class="card status-banner status-error">
    {{ error }}
  </div>
  <div v-else-if="message" class="card status-banner status-info">
    {{ message }}
  </div>
</template>

<style scoped>
.status-banner {
  margin-bottom: 12px;
  font-size: 13px;
  border-width: 1px;
  border-style: solid;
}

.status-info {
  color: var(--text-secondary);
  border-color: var(--border);
  background: var(--surface-muted);
}

.status-error {
  color: var(--error);
  border-color: var(--error);
  background: var(--error-soft);
}
</style>
