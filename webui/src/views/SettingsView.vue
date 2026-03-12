<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useConfig } from '@/composables/useConfig'
import { useApps } from '@/composables/useApps'
import { useAppState } from '@/composables/useAppState'
import { clearDownloadCache } from '@/api/commands'

const {
  loading,
  setTargetApps,
} = useConfig()
const { apps, load: loadApps, loading: appsLoading } = useApps()
const appState = useAppState()
const clearingCache = ref(false)
const cacheMessage = ref('')
const cacheError = ref('')

onMounted(() => {
  void appState.refresh(true)
  void loadApps()
})

const hasSnapshot = computed(() => appState.snapshot.value !== null)
const showLoadingState = computed(() => loading.value && !hasSnapshot.value)
const showRefreshingHint = computed(() => loading.value && hasSnapshot.value)
const targetAppList = computed(() => {
  const str = appState.targetApps.value
  return str ? str.split(',').filter(Boolean) : []
})

const targetScopeText = computed(() => targetAppList.value.length === 0 ? '全部已检测应用' : `已指定 ${targetAppList.value.length} 个应用`)
const installedResourceCount = computed(() => appState.installedResourceCount.value)

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
    await appState.refresh(true)
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

    <div v-if="showLoadingState" class="state-text">加载中...</div>
    <template v-else>
      <div v-if="showRefreshingHint" class="state-text refreshing-text">正在刷新最新状态...</div>

      <div class="card summary-card">
        <div class="summary-item">
          <div class="meta-text">当前同步范围</div>
          <div class="summary-value small">{{ targetScopeText }}</div>
        </div>
        <div class="summary-item">
          <div class="meta-text">已下载资源</div>
          <div class="summary-value">{{ installedResourceCount }}</div>
        </div>
      </div>

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
        <div v-if="appsLoading" class="state-text">正在检测输入法应用...</div>
        <div v-else-if="apps.length === 0" class="state-text">未检测到可用输入法应用</div>
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
.refreshing-text {
  padding: 0;
  text-align: left;
  font-size: 12px;
}

.summary-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.summary-item {
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-small);
  background: var(--surface-muted);
  padding: 10px;
}

.summary-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 650;
}

.summary-value.small {
  font-size: 13px;
  line-height: 1.4;
}

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
