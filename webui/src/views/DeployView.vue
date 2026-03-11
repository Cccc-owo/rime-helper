<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { readLog } from '@/api/commands'
import { useApps } from '@/composables/useApps'
import { useConfig } from '@/composables/useConfig'
import { useUpdate } from '@/composables/useUpdate'
import { useResources } from '@/composables/useResources'
import { useDeployAction } from '@/composables/useDeployAction'
import AppCard from '@/components/AppCard.vue'
import UpdateCard from '@/components/UpdateCard.vue'
import StatusBanner from '@/components/StatusBanner.vue'

const { apps, loading: appsLoading, load: loadApps } = useApps()
const { config, loading: configLoading, load: loadConfig } = useConfig()
const { resumeDownloadTask } = useResources()
const {
  updates,
  checking,
  updating,
  error,
  check,
  update,
  deployToApps,
  status,
  loadStatus,
} = useUpdate()

const deployAction = useDeployAction()
const opMessage = computed(() => deployAction.message.value)
const opError = computed(() => deployAction.error.value)
const deploying = computed(() => deployAction.deploying.value)

const logs = ref('')
const logLoading = ref(false)
const logExpanded = ref(false)
const lastRefreshedAt = ref('')
let refreshTimer: ReturnType<typeof setInterval> | null = null

const enabledResourceCount = computed(() => config.value?.resources?.filter(r => r.enabled).length ?? 0)

const multiSchemaWarning = computed(() => {
  const enabledSchemas = (config.value?.resources ?? [])
    .filter(r => r.category === 'schema' && r.enabled)
    .sort((a, b) => a.order - b.order)

  if (enabledSchemas.length > 1) {
    const names = enabledSchemas.map(r => r.name).join(' → ')
    return `检测到多个完整方案同时启用。文件同步时会按顺序合并并覆盖同名文件（后者覆盖前者）：${names}`
  }
  return ''
})

onMounted(async () => {
  await Promise.all([
    loadApps(),
    loadConfig(),
    loadStatus(),
    resumeDownloadTask(),
  ])
})

onUnmounted(() => {
  stopLogPolling()
})

function formatTime(ts: string): string {
  if (!ts || ts === '0') return '从未'
  const d = new Date(Number(ts) * 1000)
  return d.toLocaleString('zh-CN')
}

async function checkAll() {
  deployAction.clear()
  deployAction.setMessage('正在检查所有启用资源的更新...')
  await check()
  if (error.value) {
    deployAction.setError(`${error.value}。详情见日志区域`)
    return
  }
  const hasUpdate = updates.value.some(item => item.has_update)
  deployAction.setMessage(
    hasUpdate
      ? '检查完成：发现可更新资源，可执行「全部更新」或单项更新'
      : '检查完成：所有启用资源均为最新版本',
  )
}

async function updateAll() {
  deployAction.clear()
  deployAction.setMessage('正在启动全部启用资源更新...')
  await update()
  if (error.value) {
    deployAction.setError(`${error.value}。详情见日志区域`)
    return
  }
  await loadStatus()
  await check()
  if (error.value) {
    deployAction.setError(`${error.value}。详情见日志区域`)
    return
  }
  deployAction.setMessage('更新完成，可将文件同步到目标输入法数据目录')
}

async function handleSingleUpdate(id: string) {
  deployAction.clear()
  deployAction.setMessage(`正在启动「${id}」更新...`)
  await update(id)
  if (error.value) {
    deployAction.setError(`${error.value}。详情见日志区域`)
    return
  }
  await loadStatus()
  await check(id)
  if (error.value) {
    deployAction.setError(`${error.value}。详情见日志区域`)
    return
  }
  deployAction.setMessage(`资源「${id}」更新完成`)
}

async function handleDeploy() {
  await deployAction.run(
    async () => {
      await deployToApps()
      if (error.value) throw new Error(error.value)
    },
    {
      preHint: '如启用了多个完整方案，建议先保留一个再同步文件。',
      basePendingMessage: '正在将文件同步到已选择的输入法数据目录，请稍候...',
      successMessage: '文件已同步到输入法数据目录。实际生效取决于输入法内的 Rime 引擎，请在输入法内执行重新部署并查看日志。',
    },
  )
}

async function loadLogs() {
  logLoading.value = true
  try {
    logs.value = await readLog()
    lastRefreshedAt.value = new Date().toLocaleTimeString('zh-CN', { hour12: false })
  } catch {
    logs.value = '无法读取日志'
  } finally {
    logLoading.value = false
  }
}

function startLogPolling() {
  if (refreshTimer) return
  refreshTimer = setInterval(loadLogs, 5000)
}

function stopLogPolling() {
  if (!refreshTimer) return
  clearInterval(refreshTimer)
  refreshTimer = null
}

async function toggleLogExpanded() {
  logExpanded.value = !logExpanded.value
  if (logExpanded.value) {
    await loadLogs()
    startLogPolling()
  } else {
    stopLogPolling()
  }
}
</script>

<template>
  <div class="deploy-view page-shell">
    <h1 class="section-title">同步</h1>
    <p class="section-desc">用于检查资源更新、执行文件同步并查看运行日志。</p>

    <section class="section">
      <div class="section-head">
        <h2 class="card-title">同步状态</h2>
      </div>
      <div class="status-grid card">
        <div class="status-item">
          <div class="meta-text">检测到应用</div>
          <div class="status-value">{{ apps.length }}</div>
        </div>
        <div class="status-item">
          <div class="meta-text">启用资源数</div>
          <div class="status-value">{{ enabledResourceCount }}</div>
        </div>
        <div class="status-item">
          <div class="meta-text">上次更新</div>
          <div class="status-value small">{{ status ? formatTime(status.last_update) : '-' }}</div>
        </div>
        <div class="status-item">
          <div class="meta-text">同步目标</div>
          <div class="status-value">{{ (config?.target_apps ?? '') ? '已指定' : '全部应用' }}</div>
        </div>
      </div>

      <div v-if="appsLoading || configLoading" class="state-text">加载中...</div>
      <div v-else-if="apps.length === 0" class="state-text">未检测到可用输入法应用</div>
      <AppCard v-for="app in apps" :key="app.package" :app="app" />
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="card-title">更新</h2>
      </div>
      <div class="actions card">
        <button class="btn btn-primary" :disabled="checking" @click="checkAll">
          {{ checking ? '检查中...' : '检查更新' }}
        </button>
        <button class="btn btn-outline" :disabled="updating" @click="updateAll">
          {{ updating ? '更新中...' : '全部更新' }}
        </button>
      </div>

      <StatusBanner :error="opError" :message="opMessage" />
      <div v-if="multiSchemaWarning" class="card warning-card">
        {{ multiSchemaWarning }}
      </div>

      <div v-if="updates.length === 0 && !checking" class="state-text card empty-state">
        还没有更新结果。点击「检查更新」后可查看各资源状态。
      </div>

      <UpdateCard
        v-for="item in updates"
        :key="item.id"
        :item="item"
        :updating="updating"
        @update="handleSingleUpdate(item.id)"
      />
    </section>

    <section class="section">
      <div class="section-head">
        <h2 class="card-title">文件同步</h2>
      </div>
      <div class="card">
        <button class="btn btn-primary btn-block" :disabled="deploying || updating || checking" @click="handleDeploy">
          {{ deploying ? '同步中...' : '同步到数据目录' }}
        </button>
      </div>
    </section>

    <section class="section">
      <button class="btn btn-ghost btn-block" @click="toggleLogExpanded">
        {{ logExpanded ? '收起日志' : '展开日志' }}
      </button>

      <div v-if="logExpanded" class="card log-panel">
        <div class="log-header">
          <div class="meta-text" v-if="lastRefreshedAt">上次刷新：{{ lastRefreshedAt }}</div>
          <button class="btn btn-outline" :disabled="logLoading" @click="loadLogs">
            {{ logLoading ? '刷新中...' : '刷新日志' }}
          </button>
        </div>
        <pre v-if="logs">{{ logs }}</pre>
        <div v-else class="state-text">尚无日志，先执行更新或同步</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section {
  margin-bottom: 16px;
}

.section-head {
  margin-bottom: 8px;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.status-item {
  border: 1px solid var(--outline-variant);
  border-radius: var(--radius-small);
  background: var(--surface-muted);
  padding: 10px;
}

.status-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 650;
}

.status-value.small {
  font-size: 13px;
  line-height: 1.4;
}

.actions {
  display: flex;
  gap: 8px;
}

.actions .btn {
  flex: 1;
}

.warning-card {
  font-size: 13px;
  color: var(--warning);
  background: var(--warning-soft);
  border: 1px solid var(--warning);
  margin-bottom: 12px;
}

.log-panel {
  max-height: 64vh;
  overflow-y: auto;
}

.log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

pre {
  font-size: 11px;
  line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
