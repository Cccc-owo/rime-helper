<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useConfig } from '@/composables/useConfig'
import { useResources } from '@/composables/useResources'
import { useAppState } from '@/composables/useAppState'
import { removeResource, resetResources } from '@/api/commands'
import { useDeployAction } from '@/composables/useDeployAction'
import ResourceCard from '@/components/ResourceCard.vue'
import StatusBanner from '@/components/StatusBanner.vue'
import AddResourceForm from '@/components/AddResourceForm.vue'
import type { Resource } from '@/types'

const CATEGORY_LABELS: Record<string, string> = {
  schema: '方案',
  dict: '词库',
  model: '模型',
}

const BUILTIN_IDS = new Set([
  'rime-ice', 'rime-frost', 'oh-my-rime', 'moegirl',
  'wanxiang', 'zhwiki', 'wanxiang-gram',
])

const { config, loading, load, setResourceEnabled } = useConfig()
const {
  download,
  downloadEnabled,
  getProgress,
  isDownloading,
  downloading,
  error: resourceError,
} = useResources()
const appState = useAppState()
const deployAction = useDeployAction()

const showAddForm = ref(false)
const editingResource = ref<Resource | null>(null)
const pendingDownloadLabel = ref('')
const pendingDownloadMode = ref<'single' | 'bulk' | null>(null)

onMounted(() => {
  void appState.resumeTasks()
})

const resources = computed(() => config.value?.resources ?? [])
const hasSnapshot = computed(() => appState.snapshot.value !== null)
const showLoadingState = computed(() => loading.value && !hasSnapshot.value)
const showRefreshingHint = computed(() => loading.value && hasSnapshot.value)
const existingIds = computed(() => resources.value.map(item => item.id))
const opMessage = computed(() => deployAction.message.value)
const opError = computed(() => deployAction.error.value)
const editingResourceId = computed(() => editingResource.value?.id ?? '')
const editingResourceDef = computed(() => {
  const resource = editingResource.value
  if (!resource) return null
  return {
    id: resource.id,
    name: resource.name,
    repo: resource.repo,
    strategy: resource.strategy,
    order: resource.order,
    category: resource.category,
  }
})

const groupedResources = computed(() => {
  const groups: { key: string; label: string; items: Resource[] }[] = []
  const categoryOrder = ['schema', 'dict', 'model']
  const grouped = new Map<string, Resource[]>()

  for (const res of resources.value) {
    const cat = res.category ?? 'other'
    if (!grouped.has(cat)) grouped.set(cat, [])
    grouped.get(cat)!.push(res)
  }

  for (const cat of categoryOrder) {
    const items = grouped.get(cat)
    if (items?.length) {
      groups.push({ key: cat, label: CATEGORY_LABELS[cat] ?? cat, items })
      grouped.delete(cat)
    }
  }

  for (const [cat, items] of grouped) {
    groups.push({ key: cat, label: CATEGORY_LABELS[cat] ?? '其他', items })
  }

  return groups
})

const schemaWarning = computed(() => {
  const enabledSchemas = resources.value
    .filter(r => r.category === 'schema' && r.enabled)
    .sort((a, b) => a.order - b.order)

  if (enabledSchemas.length > 1) {
    const names = enabledSchemas.map(r => r.name).join(' → ')
    return `检测到多个完整方案同时启用。文件同步时会按顺序合并并覆盖同名文件（后者覆盖前者）：${names}`
  }
  return ''
})

async function finalizePendingDownload() {
  if (!pendingDownloadMode.value) return

  const mode = pendingDownloadMode.value
  const label = pendingDownloadLabel.value
  pendingDownloadMode.value = null
  pendingDownloadLabel.value = ''

  await load()

  if (resourceError.value) {
    deployAction.setError(
      mode === 'bulk'
        ? `下载有问题：${resourceError.value}。可在「同步」页查看日志`
        : `下载「${label}」失败：${resourceError.value}。可在「同步」页查看日志`,
    )
    return
  }

  deployAction.setMessage(mode === 'bulk' ? '已开始的资源下载已完成' : `「${label}」下载完成`)
}

watch(
  () => downloading.value,
  async (active, previous) => {
    if (active || !previous) return
    await finalizePendingDownload()
  },
)

function closeForm() {
  showAddForm.value = false
  editingResource.value = null
}

function openAddForm() {
  editingResource.value = null
  showAddForm.value = true
}

function openEditForm(res: Resource) {
  showAddForm.value = false
  editingResource.value = { ...res }
}

async function handleAddSuccess(name: string) {
  const isEdit = !!editingResource.value
  closeForm()
  await load()
  deployAction.setMessage(isEdit
    ? `已保存「${name}」配置`
    : `已添加「${name}」。请按需启用并下载`)
}

async function handleResetResources() {
  deployAction.clear()
  if (!confirm('确定恢复默认资源列表吗？\n\n这会覆盖当前 resources.conf。\n不会删除已下载文件和版本记录。')) return
  try {
    await resetResources()
    closeForm()
    await load()
    deployAction.setMessage('已恢复默认资源列表')
  } catch (e) {
    deployAction.setError(`恢复默认失败：${deployAction.formatError(e)}`)
  }
}

async function handleRemove(res: Resource) {
  deployAction.clear()
  if (!confirm(`确定要删除资源「${res.name}」吗？`)) return
  try {
    await removeResource(res.id)
    await load()
    deployAction.setMessage(`已删除资源「${res.name}」`)
  } catch (e) {
    deployAction.setError(`删除失败：${deployAction.formatError(e)}`)
  }
}

async function handleToggle(resource: Resource, enabled: boolean) {
  deployAction.clear()
  try {
    await setResourceEnabled(resource.id, enabled)
    deployAction.setMessage(enabled
      ? `已启用「${resource.name}」`
      : `已停用「${resource.name}」`)
  } catch (e) {
    deployAction.setError(`切换失败：${deployAction.formatError(e)}`)
  }
}

async function handleDownloadAll() {
  deployAction.clear()
  deployAction.setMessage('正在启动已启用资源下载...')
  pendingDownloadMode.value = null
  pendingDownloadLabel.value = ''
  try {
    await downloadEnabled()
    pendingDownloadMode.value = 'bulk'
    deployAction.setMessage('已开始后台下载已启用资源，可在本页查看进度')
    if (!downloading.value) {
      await finalizePendingDownload()
    }
  } catch (e) {
    deployAction.setError(`下载失败：${deployAction.formatError(e)}。可在「同步」页查看日志`)
  }
}

async function handleDownload(res: Resource) {
  deployAction.clear()
  deployAction.setMessage(`正在启动「${res.name}」下载...`)
  pendingDownloadMode.value = null
  pendingDownloadLabel.value = ''
  try {
    await download(res.id)
    pendingDownloadMode.value = 'single'
    pendingDownloadLabel.value = res.name
    deployAction.setMessage(`已开始后台下载「${res.name}」，可在本页查看进度`)
    if (!downloading.value) {
      await finalizePendingDownload()
    }
  } catch (e) {
    deployAction.setError(`下载「${res.name}」失败：${deployAction.formatError(e)}。可在「同步」页查看日志`)
  }
}
</script>

<template>
  <div class="resources page-shell">
    <h1 class="section-title">资源管理</h1>
    <p class="section-desc">用于管理资源定义、启用状态与下载任务。</p>

    <div class="card scope-card">
      本页仅用于资源管理，不执行文件同步。
    </div>

    <div v-if="showLoadingState" class="state-text">加载中...</div>
    <template v-else>
      <div v-if="showRefreshingHint" class="state-text refreshing-text">正在刷新最新状态...</div>

      <div class="card summary-card">
        <div class="summary-item">
          <div class="meta-text">启用资源</div>
          <div class="summary-value">{{ appState.enabledResourceCount.value }}</div>
        </div>
        <div class="summary-item">
          <div class="meta-text">已下载资源</div>
          <div class="summary-value">{{ appState.installedResourceCount.value }}</div>
        </div>
      </div>

      <div v-if="schemaWarning" class="card warning-card">
        {{ schemaWarning }}
      </div>

      <StatusBanner :error="opError" :message="opMessage" />

      <div v-for="group in groupedResources" :key="group.key" class="resource-group">
        <div class="group-title">{{ group.label }}</div>
        <template v-for="res in group.items" :key="res.id">
          <ResourceCard
            :resource="res"
            :progress="getProgress(res.id)"
            :downloading="isDownloading(res.id)"
            :removable="!BUILTIN_IDS.has(res.id)"
            @toggle="enabled => handleToggle(res, enabled)"
            @download="handleDownload(res)"
            @edit="openEditForm(res)"
            @remove="handleRemove(res)"
          />
          <AddResourceForm
            v-if="editingResourceId === res.id"
            :existing-ids="existingIds"
            mode="edit"
            :initial-resource="editingResourceDef"
            @cancel="closeForm"
            @added="handleAddSuccess"
          />
        </template>
      </div>

      <AddResourceForm
        v-if="showAddForm"
        :existing-ids="existingIds"
        mode="add"
        @cancel="closeForm"
        @added="handleAddSuccess"
      />

      <div class="action-buttons">
        <button
          v-if="!showAddForm && !editingResource"
          class="btn btn-outline btn-block"
          @click="openAddForm"
        >
          + 添加自定义资源
        </button>
        <button
          class="btn btn-outline btn-block"
          :disabled="downloading"
          @click="handleResetResources"
        >
          恢复默认资源列表
        </button>
        <button
          class="btn btn-primary btn-block"
          :disabled="downloading"
          @click="handleDownloadAll"
        >
          {{ downloading ? '下载中...' : '下载全部启用资源' }}
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.scope-card {
  font-size: 12px;
  color: var(--text-secondary);
  border: 1px dashed var(--outline-variant);
  background: transparent;
}

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

.warning-card {
  font-size: 13px;
  color: var(--warning);
  background: var(--warning-soft);
  border: 1px solid var(--warning);
}

.resource-group {
  margin-bottom: 6px;
}

.group-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
