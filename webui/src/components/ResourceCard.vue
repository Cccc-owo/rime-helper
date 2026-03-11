<script setup lang="ts">
import { computed } from 'vue'
import type { Resource } from '@/types'

const props = defineProps<{
  resource: Resource
  progress?: string
  removable?: boolean
  downloading?: boolean
}>()

const emit = defineEmits<{
  toggle: [enabled: boolean]
  download: []
  edit: []
  remove: []
}>()

const actionLabel = computed(() => {
  if (props.downloading) return '下载中...'
  if (!props.resource.installed) return '下载'
  return '重新下载'
})
</script>

<template>
  <div class="card resource-card">
    <div class="resource-header">
      <div class="resource-info">
        <div class="resource-name">{{ resource.name }}</div>
        <a
          class="resource-repo"
          :href="`https://github.com/${resource.repo}`"
          target="_blank"
          rel="noopener"
        >{{ resource.repo }}</a>
      </div>
      <div class="resource-actions">
        <button
          class="btn btn-outline btn-mini"
          title="编辑资源"
          @click="emit('edit')"
        >
          编辑
        </button>
        <button
          v-if="removable"
          class="btn-icon btn-remove"
          title="删除资源"
          @click="emit('remove')"
        >
          ✕
        </button>
        <label class="toggle">
          <input
            type="checkbox"
            :checked="resource.enabled"
            @change="emit('toggle', ($event.target as HTMLInputElement).checked)"
          />
          <span class="toggle-slider"></span>
        </label>
      </div>
    </div>
    <div class="resource-footer">
      <div class="resource-meta">
        <span class="resource-version" v-if="resource.version">
          {{ resource.version }}
        </span>
        <span class="resource-version" v-else>未安装</span>
        <span class="resource-installed" v-if="resource.installed">已下载</span>
      </div>
      <div class="resource-tail">
        <span class="resource-progress" v-if="progress">{{ progress }}</span>
        <button
          v-if="resource.enabled"
          class="btn btn-outline btn-mini"
          :disabled="downloading"
          @click="emit('download')"
        >
          {{ actionLabel }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-card {
  background: var(--surface);
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.resource-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-mini {
  min-height: 30px;
  padding: 4px 10px;
  font-size: 12px;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: transparent;
}

.btn-remove {
  color: var(--text-secondary);
}

.btn-remove:active {
  color: var(--error);
  background: var(--error-soft);
}

.resource-name {
  font-size: 16px;
  font-weight: 600;
}

.resource-repo {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.resource-repo:active {
  color: var(--primary);
}

.resource-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 10px;
}

.resource-meta,
.resource-tail {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.resource-version {
  font-size: 13px;
  color: var(--text-secondary);
}

.resource-installed {
  font-size: 12px;
  color: var(--success);
}

.resource-progress {
  font-size: 12px;
  color: var(--primary);
}
</style>
