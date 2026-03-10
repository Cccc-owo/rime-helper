<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useConfig } from '@/composables/useConfig'
import { useApps } from '@/composables/useApps'
import { clearDownloadCache } from '@/api/commands'

const {
  config,
  loading,
  load,
  setTargetApps,
} = useConfig()
const { apps, load: loadApps } = useApps()
const clearingCache = ref(false)
const cacheMessage = ref('')
const cacheError = ref('')

onMounted(() => {
  load()
  loadApps()
})

const targetAppList = computed(() => {
  const str = config.value?.target_apps ?? ''
  return str ? str.split(',') : []
})

async function toggleTargetApp(pkg: string, checked: boolean) {
  const current = new Set(targetAppList.value)
  if (checked) current.add(pkg)
  else current.delete(pkg)
  await setTargetApps(Array.from(current).join(','))
}

function isTargetApp(pkg: string): boolean {
  if (targetAppList.value.length === 0) return true
  return targetAppList.value.includes(pkg)
}

async function clearCache() {
  cacheMessage.value = ''
  cacheError.value = ''
  if (!confirm('确定清除下载缓存吗？\n\n仅删除下载临时文件，不影响已同步到输入法的数据。')) return

  clearingCache.value = true
  try {
    await clearDownloadCache()
    cacheMessage.value = '已清除下载缓存'
  } catch (e) {
    cacheError.value = e instanceof Error ? e.message : String(e)
  } finally {
    clearingCache.value = false
  }
}
</script>

<template>
  <div class="settings page-shell">
    <h1 class="section-title">设置</h1>
    <p class="section-desc">用于配置同步目标与缓存清理。</p>

    <div v-if="loading" class="state-text">加载中...</div>
    <template v-else>
      <div class="card">
        <div class="card-title">目标应用</div>
        <div class="setting-desc target-desc">
          选择同步目标（不选表示同步到所有已检测应用）。
        </div>
        <div v-for="app in apps" :key="app.package" class="app-check">
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="isTargetApp(app.package)"
              @change="toggleTargetApp(app.package, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ app.label }}</span>
            <span class="app-pkg">{{ app.package }}</span>
          </label>
        </div>
        <div v-if="apps.length === 0" class="state-text">未检测到可用输入法应用</div>
      </div>

      <div class="card">
        <div class="card-title">维护</div>
        <div class="setting-desc target-desc">
          清理下载缓存，不影响已同步的数据文件。
        </div>
        <button class="btn btn-outline" :disabled="clearingCache" @click="clearCache">
          {{ clearingCache ? '清理中...' : '清除下载缓存' }}
        </button>
        <div v-if="cacheMessage" class="cache-success">{{ cacheMessage }}</div>
        <div v-if="cacheError" class="cache-error">清理失败：{{ cacheError }}</div>
      </div>

    </template>
  </div>
</template>

<style scoped>
.setting-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.target-desc {
  margin-bottom: 12px;
}

.app-check {
  padding: 8px 0;
  border-bottom: 1px solid var(--outline-variant);
}

.app-check:last-child {
  border-bottom: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
}

.app-pkg {
  font-size: 11px;
  color: var(--text-secondary);
  margin-left: auto;
}

.cache-success {
  margin-top: 10px;
  font-size: 13px;
  color: var(--success);
}

.cache-error {
  margin-top: 10px;
  font-size: 13px;
  color: var(--danger);
}
</style>
